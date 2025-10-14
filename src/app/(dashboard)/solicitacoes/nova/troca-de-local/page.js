"use client"

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { cn } from '../../../../../lib/utils';
import api from '../../../../../lib/api';
import { useAuth } from '../../../../../hooks/useAuth';
import { Button } from "../../../../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../../../components/ui/card";
import { Input } from "../../../../../components/ui/input";
import { Label } from "../../../../../components/ui/label";
import { Textarea } from "../../../../../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../../../components/ui/select";
import { Popover, PopoverTrigger, PopoverContent } from '../../../../../components/ui/popover';
import { Calendar } from '../../../../../components/ui/calendar';
import { Separator } from '../../../../../components/ui/separator';
import { SearchableSelect } from '../components/SearchableSelect';

export default function FormTrocaDeLocalPage() {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const router = useRouter();

  // Estados para os filtros em cascata
  const [companies, setCompanies] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [allWorkLocations, setAllWorkLocations] = useState([]);
  
  const [selectedCompany, setSelectedCompany] = useState('');
  const [selectedContract, setSelectedContract] = useState('');
  
  // Estados para os dados selecionados
  const [availableWorkLocations, setAvailableWorkLocations] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  const [formData, setFormData] = useState({ 
      employeeId: '', 
      newWorkLocationId: '', 
      reason: '', 
      suggestedDate: null 
  });

  // 1. Busca inicial de Clientes e todos os Locais de Trabalho
  useEffect(() => {
    const fetchInitialData = async () => {
      if (!user) return;
      setIsDataLoading(true);
      try {
        let companiesData = [];
        if (user.profile === 'SOLICITANTE' || user.profile === 'GESTAO') {
            const response = await api.get(`/associations/users/${user.id}/companies`);
            companiesData = response.data || [];
        } else {
            const response = await api.get('/companies?all=true');
            companiesData = response.data.companies || [];
        }
        setCompanies(companiesData);

        const locationsRes = await api.get('/work-locations?all=true');
        setAllWorkLocations(locationsRes.data.workLocations || []);
      } catch (error) {
        toast.error("Falha ao carregar os dados de apoio.");
      } finally {
        setIsDataLoading(false);
      }
    };
    fetchInitialData();
  }, [user]);

  // 2. Busca Contratos quando um Cliente é selecionado
  useEffect(() => {
    const fetchContracts = async () => {
      if (selectedCompany) {
        setIsDataLoading(true);
        setContracts([]);
        setEmployees([]);
        setSelectedContract('');
        handleChange('employeeId', '');
        try {
          const response = await api.get(`/contracts?companyId=${selectedCompany}&all=true`);
          setContracts(response.data.contracts || []);
        } catch (error) { toast.error("Falha ao carregar contratos."); } 
        finally { setIsDataLoading(false); }
      } else {
        setContracts([]);
        setEmployees([]);
      }
    };
    fetchContracts();
  }, [selectedCompany]);

  // 3. Busca Colaboradores quando um Contrato é selecionado
  useEffect(() => {
    const fetchEmployees = async () => {
      if (selectedContract) {
        setIsDataLoading(true);
        setEmployees([]);
        handleChange('employeeId', '');
        try {
          const response = await api.get(`/employees?contractId=${selectedContract}&all=true`);
          setEmployees(response.data.employees || []);
        } catch (error) { toast.error("Falha ao carregar colaboradores."); } 
        finally { setIsDataLoading(false); }
      } else {
        setEmployees([]);
      }
    };
    fetchEmployees();
  }, [selectedContract]);

  const handleChange = (id, value) => {
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleEmployeeChange = (employeeId) => {
    const employee = employees.find(e => e.id === employeeId);
    setSelectedEmployee(employee || null);
    handleChange('employeeId', employeeId);
    handleChange('newWorkLocationId', ''); 

    if (employee) {
      // **LÓGICA CORRIGIDA**: Filtra locais apenas do mesmo contrato do colaborador
      const availableLocations = allWorkLocations.filter(loc => 
        loc.contractId === employee.contractId && loc.id !== employee.workLocationId
      );
      setAvailableWorkLocations(availableLocations);
    } else {
      setAvailableWorkLocations([]);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!selectedEmployee) {
      toast.warning("Por favor, selecione um colaborador.");
      return;
    }
    if (formData.suggestedDate && new Date(formData.suggestedDate) < new Date().setHours(0, 0, 0, 0)) {
        toast.error("A data sugerida para a mudança não pode ser uma data passada.");
        return;
    }
    
    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        companyId: selectedEmployee.contract.companyId,
        contractId: selectedEmployee.contractId,
        workLocationId: selectedEmployee.workLocationId, // Local de trabalho original
        positionId: selectedEmployee.positionId,
      };
      
      if (!payload.suggestedDate) {
          delete payload.suggestedDate;
      }

      await api.post('/requests/workplace-change', payload);
      toast.success("Solicitação de troca de local enviada com sucesso!");
      router.push('/solicitacoes');
    } catch (error) {
      toast.error(error.response?.data?.error || "Ocorreu um erro ao enviar a solicitação.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const employeeOptions = employees.map(emp => ({
    value: emp.id,
    label: `${emp.name} (Matrícula: ${emp.registration})`
  }));

  const workLocationOptions = availableWorkLocations.map(loc => ({
    value: loc.id,
    label: loc.name
  }));

  return (
    <div className="container mx-auto py-2">
      <Card className="max-w-3xl mx-auto">
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle className="text-2xl">Formulário de Troca de Local de Trabalho</CardTitle>
            <CardDescription>Selecione o colaborador, o novo local desejado e justifique o motivo da mudança.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="companyId">Cliente</Label>
                <Select value={selectedCompany} onValueChange={setSelectedCompany} disabled={isDataLoading}>
                  <SelectTrigger><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
                  <SelectContent>{companies.map(c => <SelectItem key={c.id} value={c.id}>{c.tradeName || c.corporateName}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="contractId">Contrato</Label>
                <Select value={selectedContract} onValueChange={setSelectedContract} disabled={isDataLoading || !selectedCompany}>
                  <SelectTrigger><SelectValue placeholder="Selecione o contrato" /></SelectTrigger>
                  <SelectContent>{contracts.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="employeeId" className="font-semibold">Colaborador</Label>
              <SearchableSelect
                id="employeeId"
                options={employeeOptions}
                value={formData.employeeId}
                onChange={handleEmployeeChange}
                placeholder={isDataLoading ? "Carregando..." : "Selecione um colaborador"}
                disabled={isDataLoading || !selectedContract}
              />
            </div>
            
            {selectedEmployee && (
              <div className="p-4 border rounded-md bg-muted/40 space-y-4">
                <h3 className="text-md font-semibold mb-2">Detalhes da Troca</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                  <div className="space-y-2">
                    <Label>Local de Trabalho Atual</Label>
                    <Input value={selectedEmployee.workLocation?.name || 'Não definido'} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newWorkLocationId" className="required">Local de Trabalho Desejado</Label>
                    {/* **COMPONENTE SUBSTITUÍDO** por SearchableSelect */}
                    <SearchableSelect
                        id="newWorkLocationId"
                        options={workLocationOptions}
                        value={formData.newWorkLocationId}
                        onChange={(value) => handleChange('newWorkLocationId', value)}
                        placeholder="Selecione o novo local"
                        disabled={!selectedEmployee}
                        required
                    />
                  </div>
                </div>
              </div>
            )}

            <Separator />
            
            <div className="space-y-2">
                <Label htmlFor="suggestedDate">Data Sugerida para Mudança (Opcional)</Label>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button id="suggestedDate" variant={"outline"} className={cn("w-full sm:w-[280px] justify-start text-left font-normal", !formData.suggestedDate && "text-muted-foreground")}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {formData.suggestedDate ? format(formData.suggestedDate, "dd 'de' LLLL 'de' yyyy", { locale: ptBR }) : <span>Selecione uma data</span>}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                        <Calendar mode="single" selected={formData.suggestedDate} onSelect={(date) => handleChange('suggestedDate', date)} initialFocus locale={ptBR} />
                    </PopoverContent>
                </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason" className="font-semibold required">Motivo / Justificativa</Label>
              <Textarea 
                id="reason" 
                value={formData.reason} 
                onChange={(e) => handleChange('reason', e.target.value)} 
                placeholder="Descreva detalhadamente o motivo para a solicitação de troca de local..."
                required 
                rows={5}
              />
            </div>
            
            <div className="flex justify-end gap-4 pt-4 border-t mt-6">
                <Button variant="outline" type="button" onClick={() => router.push('/solicitacoes')} disabled={isSubmitting}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting || isDataLoading}>
                  {(isSubmitting || isDataLoading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isSubmitting ? "Enviando..." : (isDataLoading ? "Aguarde..." : "Enviar Solicitação")}
                </Button>
            </div>
          </CardContent>
        </form>
      </Card>
    </div>
  );
}