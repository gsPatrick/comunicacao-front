"use client"

import * as React from "react"
import Link from "next/link"
import { PlusCircle, Calendar as CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale" // <-- 1. IMPORTAÇÃO DA LOCALIDADE EM PORTUGUÊS
import { toast } from "sonner"

import api from "../../../lib/api"
import { cn } from "../../../lib/utils"
import { columns } from "./columns"
import { DataTable } from "./data-table"
import { Button } from "../../../components/ui/button"
import { Card, CardContent } from "../../../components/ui/card"
import { Popover, PopoverContent, PopoverTrigger } from "../../../components/ui/popover"
import { Calendar } from "../../../components/ui/calendar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select"
import { Input } from "../../../components/ui/input"
import { useAuth } from "../../../hooks/useAuth"

export default function SolicitacoesPage() {
  const { user } = useAuth();
  
  // Estados para os filtros e os dados da tabela
  const [filters, setFilters] = React.useState({ companyId: '', contractId: '', date: null });
  const [data, setData] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(true);
  
  // Estados para popular os selects
  const [companies, setCompanies] = React.useState([]);
  const [contracts, setContracts] = React.useState([]);
  const [isSupportDataLoading, setIsSupportDataLoading] = React.useState(true);

  // Busca os dados de apoio (empresas)
  React.useEffect(() => {
    if (user && user.profile !== 'SOLICITANTE') {
      const fetchCompanies = async () => {
        setIsSupportDataLoading(true);
        try {
          const response = await api.get('/companies?all=true'); // Adicionado all=true para garantir que todos venham
          setCompanies(response.data.companies || []);
        } catch (error) { toast.error("Falha ao carregar a lista de clientes."); } 
        finally { setIsSupportDataLoading(false); }
      };
      fetchCompanies();
    } else {
      setIsSupportDataLoading(false);
    }
  }, [user]);

  // Busca os contratos quando uma empresa é selecionada
  React.useEffect(() => {
    const fetchContracts = async () => {
      if (filters.companyId) {
        setIsSupportDataLoading(true);
        setContracts([]);
        handleFilterChange('contractId', '');
        try {
          const response = await api.get(`/contracts?companyId=${filters.companyId}&all=true`); // Adicionado all=true
          setContracts(response.data.contracts || []);
        } catch (error) { toast.error("Falha ao carregar contratos do cliente."); } 
        finally { setIsSupportDataLoading(false); }
      } else {
        setContracts([]);
      }
    };
    if (user && user.profile !== 'SOLICITANTE') { fetchContracts(); }
  }, [filters.companyId, user]);
  
  // --- LÓGICA DE BUSCA DE DADOS CENTRALIZADA AQUI ---
  const fetchData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.companyId) params.append('companyId', filters.companyId);
      if (filters.contractId) params.append('contractId', filters.contractId);
      if (filters.date?.from) params.append('startDate', filters.date.from.toISOString());
      if (filters.date?.to) params.append('endDate', filters.date.to.toISOString());

      const response = await api.get('/requests', { params });
      setData(response.data.requests || []);
    } catch (error) {
      toast.error("Falha ao carregar a lista de solicitações.");
      setData([]); // Garante que a tabela não mostre dados antigos em caso de erro
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  // Dispara a busca sempre que os filtros mudam
  React.useEffect(() => {
    fetchData();
  }, [fetchData]);


  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="container mx-auto py-2">
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gerenciamento de Solicitações</h1>
          <p className="text-muted-foreground mt-1">
            Filtre e acompanhe o andamento de todas as solicitações.
          </p>
        </div>
        <Link href="/solicitacoes/nova" className="mt-4 md:mt-0">
          <Button><PlusCircle className="mr-2 h-4 w-4" />Nova Solicitação</Button>
        </Link>
      </div>

      {user && user.profile !== 'SOLICITANTE' && (
        <Card className="mb-6">
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4">
            <Select onValueChange={(value) => handleFilterChange('companyId', value === 'all' ? '' : value)} value={filters.companyId || 'all'} disabled={isSupportDataLoading}>
              <SelectTrigger>
                <SelectValue placeholder={isSupportDataLoading ? "Carregando..." : "Filtrar por Cliente"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Clientes</SelectItem>
                {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.tradeName || c.corporateName}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select onValueChange={(value) => handleFilterChange('contractId', value === 'all' ? '' : value)} value={filters.contractId || 'all'} disabled={isSupportDataLoading || !filters.companyId}>
              <SelectTrigger>
                <SelectValue placeholder={isSupportDataLoading && filters.companyId ? "Carregando..." : "Filtrar por Contrato"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Contratos</SelectItem>
                {contracts.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Popover>
              <PopoverTrigger asChild>
                <Button id="date" variant={"outline"} className={cn("w-full justify-start text-left font-normal", !filters.date && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {/* --- 2. APLICAÇÃO DA TRADUÇÃO E MELHORIA NO FORMATO --- */}
                  {filters.date?.from ? (
                    filters.date.to ? (
                      <>{format(filters.date.from, "dd 'de' LLL", { locale: ptBR })} - {format(filters.date.to, "dd 'de' LLL", { locale: ptBR })}</>
                    ) : (
                      format(filters.date.from, "dd 'de' LLL", { locale: ptBR })
                    )
                  ) : (
                    <span>Filtrar por Período</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                {/* --- 3. ADIÇÃO DA LOCALIDADE AO CALENDÁRIO --- */}
                <Calendar 
                  initialFocus 
                  mode="range" 
                  selected={filters.date} 
                  onSelect={(date) => handleFilterChange('date', date)} 
                  numberOfMonths={2} 
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
            <Input placeholder="Filtrar por protocolo..." onChange={(e) => handleFilterChange('protocol', e.target.value)} />
          </CardContent>
        </Card>
      )}

      {/* A DataTable agora recebe os dados e o estado de loading como props */}
      <DataTable columns={columns} data={data} isLoading={isLoading} refetchData={fetchData} />
    </div>
  )
}