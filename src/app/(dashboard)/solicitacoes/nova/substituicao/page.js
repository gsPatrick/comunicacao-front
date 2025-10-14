"use client"

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import api from '../../../../../lib/api';
import { useAuth } from '../../../../../hooks/useAuth'; // Importado para consistência
import { Button } from "../../../../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../../../components/ui/card";
import { Input } from "../../../../../components/ui/input";
import { Label } from "../../../../../components/ui/label";
import { Separator } from "../../../../../components/ui/separator";
import { Textarea } from '../../../../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../../../components/ui/select";
import { SearchableSelect } from '../components/SearchableSelect';

export default function FormSubstituicaoPage() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const router = useRouter();

  // --- MUDANÇA: Estados para os filtros em cascata ---
  const [companies, setCompanies] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [employees, setEmployees] = useState([]);
  
  const [selectedCompany, setSelectedCompany] = useState('');
  const [selectedContract, setSelectedContract] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  const [formData, setFormData] = useState({
    employeeId: '',
    candidateName: '',
    candidateCpf: '',
    candidatePhone: '',
    reason: '',
  });

  // --- MUDANÇA: 1. Busca os clientes (empresas) ---
  useEffect(() => {
    const fetchCompanies = async () => {
      if (!user) return;
      setIsDataLoading(true);
      try {
        let companiesData = [];
        if (user.profile === 'SOLICITANTE') {
            const response = await api.get(`/associations/users/${user.id}/companies`);
            companiesData = response.data || [];
        } else {
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
    fetchCompanies();
  }, [user]);

  // --- MUDANÇA: 2. Busca os contratos quando um cliente é selecionado ---
  useEffect(() => {
    const fetchContracts = async () => {
      if (selectedCompany) {
        setIsDataLoading(true);
        try {
          const response = await api.get(`/contracts?companyId=${selectedCompany}&all=true`);
          setContracts(response.data.contracts || []);
        } catch (error) { 
          toast.error("Falha ao carregar contratos do cliente."); 
        } finally { 
          setIsDataLoading(false); 
        }
      }
    };
    fetchContracts();
  }, [selectedCompany]);

  // --- MUDANÇA: 3. Busca os colaboradores APENAS quando um contrato é selecionado ---
  useEffect(() => {
    const fetchEmployees = async () => {
      if (selectedContract) {
        setIsDataLoading(true);
        try {
          const response = await api.get(`/employees?contractId=${selectedContract}&all=true`);
          setEmployees(response.data.employees || []);
        } catch (error) { 
          toast.error("Falha ao carregar colaboradores do contrato."); 
        } finally { 
          setIsDataLoading(false); 
        }
      }
    };
    fetchEmployees();
  }, [selectedContract]);

  const handleChange = (id, value) => {
    setFormData(prev => ({ ...prev, [id]: value }));
  };
  
  // --- MUDANÇA: Funções para lidar com a mudança dos novos selects ---
  const handleCompanyChange = (companyId) => {
    setSelectedCompany(companyId);
    // Reseta os campos dependentes
    setSelectedContract('');
    setContracts([]);
    setEmployees([]);
    setSelectedEmployee(null);
    handleChange('employeeId', '');
  };

  const handleContractChange = (contractId) => {
    setSelectedContract(contractId);
    // Reseta os campos dependentes
    setEmployees([]);
    setSelectedEmployee(null);
    handleChange('employeeId', '');
  };
  
  const handleEmployeeChange = (employeeId) => {
    const employee = employees.find(e => e.id === employeeId);
    setSelectedEmployee(employee || null);
    handleChange('employeeId', employeeId);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!selectedEmployee) {
      toast.warning("Por favor, selecione o colaborador a ser substituído.");
      return;
    }
    setIsLoading(true);
    try {
      // --- MUDANÇA: Payload agora usa os estados de seleção e envia 'workflowName' ---
      const payload = {
        ...formData,
        workflowName: 'SUBSTITUICAO', // API espera 'workflowName' para diferenciar de desligamento
        companyId: selectedCompany,
        contractId: selectedContract,
        workLocationId: selectedEmployee.workLocationId,
        positionId: selectedEmployee.positionId,
      };
      // A rota está correta, pois /resignation trata ambos os fluxos
      await api.post('/requests/resignation', payload);
      toast.success("Solicitação de substituição enviada com sucesso!");
      router.push('/solicitacoes');
    } catch (error) {
      toast.error(error.response?.data?.error || "Erro ao enviar solicitação.");
    } finally {
      setIsLoading(false);
    }
  };

  const employeeOptions = employees.map(emp => ({
    value: emp.id,
    label: `${emp.name} (${emp.registration})`
  }));

  return (
    <div className="container mx-auto py-2">
      <Card className="max-w-3xl mx-auto">
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle className="text-2xl">Formulário de Substituição</CardTitle>
            <CardDescription>Informe quem sai e os dados do novo candidato que irá entrar no lugar.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                  <h3 className="text-lg font-medium">Colaborador a ser Substituído</h3>
                  {/* --- MUDANÇA: Adicionados selects de Cliente e Contrato --- */}
                  <div className="space-y-4 mt-4">
                      <div className="space-y-2">
                          <Label htmlFor="companyId">Cliente</Label>
                          <Select onValueChange={handleCompanyChange} value={selectedCompany} disabled={isDataLoading}>
                              <SelectTrigger id="companyId"><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
                              <SelectContent>{companies.map(c => <SelectItem key={c.id} value={c.id}>{c.tradeName}</SelectItem>)}</SelectContent>
                          </Select>
                      </div>
                      <div className="space-y-2">
                          <Label htmlFor="contractId">Contrato</Label>
                          <Select onValueChange={handleContractChange} value={selectedContract} disabled={isDataLoading || !selectedCompany}>
                              <SelectTrigger id="contractId"><SelectValue placeholder="Selecione o contrato" /></SelectTrigger>
                              <SelectContent>{contracts.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                          </Select>
                      </div>
                      <div className="space-y-2">
                          <Label htmlFor="employeeId">Nome do Colaborador</Label>
                          <SearchableSelect
                            id="employeeId"
                            options={employeeOptions}
                            value={formData.employeeId}
                            onChange={handleEmployeeChange}
                            placeholder={!selectedContract ? "Selecione um contrato primeiro" : "Selecione um colaborador"}
                            disabled={isDataLoading || !selectedContract}
                          />
                      </div>
                  </div>
              </div>
              <Separator />
              <div>
                  <h3 className="text-lg font-medium">Novo Candidato</h3>
                  <div className="space-y-4 mt-2">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2"><Label htmlFor="candidateName">Nome Completo</Label><Input id="candidateName" value={formData.candidateName} onChange={(e) => handleChange('candidateName', e.target.value)} required /></div>
                          <div className="space-y-2"><Label htmlFor="candidateCpf">CPF</Label><Input id="candidateCpf" value={formData.candidateCpf} onChange={(e) => handleChange('candidateCpf', e.target.value)} required /></div>
                      </div>
                      <div className="space-y-2"><Label htmlFor="candidatePhone">Telefone para Contato</Label><Input id="candidatePhone" value={formData.candidatePhone} onChange={(e) => handleChange('candidatePhone', e.target.value)} required /></div>
                  </div>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label htmlFor="reason">Motivo / Justificativa</Label>
                <Textarea id="reason" placeholder="Descreva por que a substituição é necessária." value={formData.reason} onChange={(e) => handleChange('reason', e.target.value)} required />
              </div>
              <div className="flex justify-end gap-4 pt-4 border-t">
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