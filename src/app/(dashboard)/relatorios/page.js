"use client";

import * as React from 'react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale'; // <-- IMPORTAÇÃO DA LOCALIDADE
import { Calendar as CalendarIcon, Users, UserPlus, UserMinus, Repeat } from 'lucide-react';

import api from '../../../lib/api';
import { cn } from '../../../lib/utils';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '../../../components/ui/popover';
import { Calendar } from '../../../components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { OverviewChart } from './components/overview-chart'; // Supondo que o gráfico esteja neste caminho
import { Skeleton } from '../../../components/ui/skeleton';

const kpiIcons = {
  admissions: UserPlus,
  departures: UserMinus,
  replacements: Repeat,
  turnover: Users,
};

export default function RelatoriosPage() {
  const [filters, setFilters] = React.useState({ companyId: '', contractId: '', date: null });
  
  const [stats, setStats] = React.useState(null);
  const [hiringData, setHiringData] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const [companies, setCompanies] = React.useState([]);
  const [contracts, setContracts] = React.useState([]);
  const [isSupportDataLoading, setIsSupportDataLoading] = React.useState(true);

  // Busca clientes
  React.useEffect(() => {
    const fetchCompanies = async () => {
      setIsSupportDataLoading(true);
      try {
        const response = await api.get('/companies?all=true');
        setCompanies(response.data.companies || []);
      } catch (error) {
        toast.error("Falha ao carregar a lista de clientes.");
      } finally {
        setIsSupportDataLoading(false);
      }
    };
    fetchCompanies();
  }, []);

  // Busca contratos quando um cliente é selecionado
  React.useEffect(() => {
    const fetchContracts = async () => {
      if (filters.companyId) {
        setIsSupportDataLoading(true);
        setContracts([]);
        handleFilterChange('contractId', '');
        try {
          const response = await api.get(`/contracts?companyId=${filters.companyId}&all=true`);
          setContracts(response.data.contracts || []);
        } catch (error) {
          toast.error("Falha ao carregar contratos do cliente.");
        } finally {
          setIsSupportDataLoading(false);
        }
      } else {
        setContracts([]);
      }
    };
    fetchContracts();
  }, [filters.companyId]);

  // Busca os dados dos relatórios
  const fetchData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.companyId) params.append('companyId', filters.companyId);
      if (filters.contractId) params.append('contractId', filters.contractId);
      if (filters.date?.from) params.append('startDate', filters.date.from.toISOString());
      if (filters.date?.to) params.append('endDate', filters.date.to.toISOString());

      const [statsRes, hiringRes] = await Promise.all([
        api.get('/reports/stats', { params }),
        api.get('/reports/hiring-overview', { params }),
      ]);

      setStats(statsRes.data);
      setHiringData(hiringRes.data);
    } catch (error) {
      toast.error("Falha ao carregar os dados dos relatórios.");
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const kpis = [
    { key: 'admissions', title: 'Admissões no Período' },
    { key: 'departures', title: 'Desligamentos no Período' },
    { key: 'replacements', title: 'Substituições no Período' },
    { key: 'turnover', title: 'Turnover (%)', suffix: '%' },
  ];

  return (
    <div className="container mx-auto py-2">
      <h1 className="text-3xl font-bold mb-6">Relatórios Gerenciais</h1>

      <Card className="mb-6">
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
          <Select onValueChange={(value) => handleFilterChange('companyId', value === 'all' ? '' : value)} value={filters.companyId || 'all'} disabled={isSupportDataLoading}>
            <SelectTrigger><SelectValue placeholder="Filtrar por Cliente" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Clientes</SelectItem>
              {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.tradeName || c.corporateName}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select onValueChange={(value) => handleFilterChange('contractId', value === 'all' ? '' : value)} value={filters.contractId || 'all'} disabled={isSupportDataLoading || !filters.companyId}>
            <SelectTrigger><SelectValue placeholder="Filtrar por Contrato" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Contratos</SelectItem>
              {contracts.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Popover>
            <PopoverTrigger asChild>
              <Button id="date" variant={"outline"} className={cn("w-full justify-start text-left font-normal", !filters.date && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {/* --- MUDANÇA: APLICAÇÃO DA TRADUÇÃO --- */}
                {filters.date?.from ? (
                  filters.date.to ? (<>{format(filters.date.from, "dd 'de' LLL", { locale: ptBR })} - {format(filters.date.to, "dd 'de' LLL", { locale: ptBR })}</>)
                  : (format(filters.date.from, "dd 'de' LLL", { locale: ptBR })))
                  : (<span>Filtrar por Período</span>)}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar initialFocus mode="range" selected={filters.date} onSelect={(date) => handleFilterChange('date', date)} numberOfMonths={2} locale={ptBR} />
            </PopoverContent>
          </Popover>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpis.map(kpi => {
          const Icon = kpiIcons[kpi.key];
          return (
            <Card key={kpi.key}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {isLoading ? <Skeleton className="h-8 w-1/2" /> : (
                  <div className="text-2xl font-bold">
                    {stats ? `${stats[kpi.key]}${kpi.suffix || ''}` : '0'}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Visão Geral de Contratações</CardTitle>
            <CardDescription>Total de admissões concluídas por mês no período selecionado.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-[350px] w-full" /> : (
              hiringData.length > 0 ? <OverviewChart data={hiringData} /> : <div className="h-[350px] flex items-center justify-center text-muted-foreground">Nenhuma admissão encontrada no período.</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}