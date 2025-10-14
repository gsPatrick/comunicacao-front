"use client"

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import api from '../../../../../lib/api';
import { useAuth } from '../../../../../hooks/useAuth'; // Adicionado hook de autenticação
import { Button } from "../../../../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../../../components/ui/card";
import { Input } from "../../../../../components/ui/input";
import { Label } from "../../../../../components/ui/label";
import { Textarea } from "../../../../../components/ui/textarea";
import { SearchableSelect } from '../components/SearchableSelect';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../../../components/ui/select"; // Adicionado Select

export default function FormDesligamentoPage() {
  const { user } = useAuth(); // Pega o usuário logado para aplicar regras de visualização
  const [isLoading, setIsLoading] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const router = useRouter();

  // --- MUDANÇA: Estados para controle dos filtros em cascata ---
  const [companies, setCompanies] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [employees, setEmployees] = useState([]);
  
  const [selectedCompany, setSelectedCompany] = useState('');
  const [selectedContract, setSelectedContract] = useState('');
  // --- FIM DA MUDANÇA ---

  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [formData, setFormData] = useState({ employeeId: '', reason: '' });

  // --- MUDANÇA: Lógica de busca de dados em cascata ---

  // 1. Busca Clientes (Companies) no carregamento inicial
  useEffect(() => {
    const fetchInitialData = async () => {
      if (!user) return;
      
      setIsDataLoading(true);
      try {
        let companiesData = [];
        if (user.profile === 'SOLICITANTE' || user.profile === 'GESTAO') {
            // Se for solicitante ou gestor, busca apenas as empresas associadas a ele
            const response = await api.get(`/associations/users/${user.id}/companies`);
            companiesData = response.data || [];
        } else {
            // Se for Admin ou RH, busca todas as empresas
            const response = await api.get('/companies?all=true');
            companiesData = response.data.companies || [];
        }
        setCompanies(companiesData);
      } catch (error) { 
        toast.error("Falha ao carregar a lista de clientes."); 
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
        setSelectedContract(''); // Limpa a seleção de contrato
        setEmployees([]); // Limpa a lista de colaboradores
        handleChange('employeeId', ''); // Limpa o formulário

        try {
          const response = await api.get(`/contracts?companyId=${selectedCompany}&all=true`);
          setContracts(response.data.contracts || []);
        } catch (error) { 
          toast.error("Falha ao carregar contratos do cliente."); 
        } finally { 
          setIsDataLoading(false); 
        }
      } else {
        setContracts([]);
        setEmployees([]);
      }
    };
    fetchContracts();
  }, [selectedCompany]);


  // 3. Busca Colaboradores APENAS quando um Contrato é selecionado
  useEffect(() => {
    const fetchEmployees = async () => {
      if (selectedContract) {
        setIsDataLoading(true);
        setEmployees([]);
        handleChange('employeeId', '');

        try {
          // A API já suporta a filtragem por `contractId`
          const response = await api.get(`/employees?contractId=${selectedContract}&all=true`); 
          setEmployees(response.data.employees || []);
        } catch (error) {
          toast.error("Falha ao carregar colaboradores do contrato.");
        } finally {
          setIsDataLoading(false);
        }
      } else {
        setEmployees([]);
      }
    };
    fetchEmployees();
  }, [selectedContract]);

  // --- FIM DA MUDANÇA ---

  const handleEmployeeChange = (employeeId) => {
    const employee = employees.find(e => e.id === employeeId);
    setSelectedEmployee(employee || null);
    handleChange('employeeId', employeeId);
  };

  const handleChange = (id, value) => {
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!selectedEmployee) {
      toast.warning("Por favor, selecione um colaborador.");
      return;
    }
    setIsLoading(true);
    try {
      const payload = {
        employeeId: formData.employeeId,
        reason: formData.reason,
        // O campo 'type' foi renomeado para 'workflowName' na API para ser mais genérico
        workflowName: 'DESLIGAMENTO',
        companyId: selectedEmployee.contract?.companyId,
        contractId: selectedEmployee.contractId,
        workLocationId: selectedEmployee.workLocationId,
        // Enviamos o positionId para consistência
        positionId: selectedEmployee.positionId,
      };
      await api.post('/requests/resignation', payload);
      toast.success("Solicitação de desligamento enviada com sucesso!");
      router.push('/solicitacoes');
    } catch (error) {
      toast.error(error.response?.data?.error || "Erro ao enviar solicitação.");
    } finally {
      setIsLoading(false);
    }
  };

  const employeeOptions = employees.map(emp => ({
    value: emp.id,
    label: `${emp.name} (Matrícula: ${emp.registration})`
  }));

  return (
    <div className="container mx-auto py-2">
      <Card className="max-w-3xl mx-auto">
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle className="text-2xl">Formulário de Desligamento</CardTitle>
            <CardDescription>Selecione o cliente, o contrato e depois o colaborador para iniciar o processo.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* --- MUDANÇA: Adicionados seletores de Cliente e Contrato --- */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="companyId">Cliente</Label>
                  <Select value={selectedCompany} onValueChange={setSelectedCompany} disabled={isDataLoading}>
                    <SelectTrigger id="companyId">
                        <SelectValue placeholder="Selecione o cliente" />
                    </SelectTrigger>
                    <SelectContent>
                        {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.tradeName}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contractId">Contrato</Label>
                  <Select value={selectedContract} onValueChange={setSelectedContract} disabled={isDataLoading || !selectedCompany}>
                      <SelectTrigger id="contractId">
                          <SelectValue placeholder="Selecione o contrato" />
                      </SelectTrigger>
                      <SelectContent>
                          {contracts.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                  </Select>
                </div>
              </div>
              {/* --- FIM DA MUDANÇA --- */}

              <div className="space-y-2">
                <Label htmlFor="employeeId">Nome do Colaborador</Label>
                <SearchableSelect
                  options={employeeOptions}
                  value={formData.employeeId}
                  onChange={handleEmployeeChange}
                  // O placeholder agora reflete o estado de carregamento ou a necessidade de selecionar um contrato
                  placeholder={isDataLoading ? "Carregando..." : (selectedContract ? "Selecione um colaborador" : "Selecione um contrato primeiro")}
                  // O seletor de colaborador é desabilitado se os dados estiverem carregando ou se nenhum contrato for selecionado
                  disabled={isDataLoading || !selectedContract}
                />
              </div>

              {selectedEmployee && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 border rounded-md bg-muted/50">
                  <div className="space-y-2"><Label>CPF</Label><Input value={selectedEmployee.cpf || ''} disabled /></div>
                  <div className="space-y-2"><Label>Cargo Atual</Label><Input value={selectedEmployee.position?.name || ''} disabled /></div>
                  <div className="space-y-2"><Label>Contrato</Label><Input value={selectedEmployee.contract?.name || ''} disabled /></div>
                  <div className="space-y-2"><Label>Local de Trabalho</Label><Input value={selectedEmployee.workLocation?.name || ''} disabled /></div>
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="reason">Motivo do Desligamento</Label>
                <Textarea id="reason" value={formData.reason} onChange={(e) => handleChange('reason', e.target.value)} required />
              </div>

              <div className="flex justify-end gap-4 pt-4 border-t mt-6">
                  <Button variant="outline" type="button" onClick={() => router.push('/solicitacoes/nova')} disabled={isLoading}>Cancelar</Button>
                  <Button type="submit" disabled={isLoading || isDataLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isLoading ? "Enviando..." : "Enviar Solicitação"}
                  </Button>
              </div>
            </div>
          </CardContent>
        </form>
      </Card>
    </div>
  );
}