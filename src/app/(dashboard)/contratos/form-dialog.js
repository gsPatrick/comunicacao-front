"use client"

import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Loader2, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '../../../lib/utils';
import api from '../../../lib/api';
import { Button } from "../../../components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../../components/ui/dialog";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import { Popover, PopoverTrigger, PopoverContent } from '../../../components/ui/popover';
import { Calendar } from '../../../components/ui/calendar';

export function FormDialog({ open, onOpenChange, initialData, onSave }) {
  const isEditing = Boolean(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [isListsLoading, setIsListsLoading] = useState(false);

  const [formData, setFormData] = useState({
    companyId: '',
    name: '',
    contractNumber: '',
    startDate: null,
    endDate: null,
  });

  useEffect(() => {
    const fetchCompanies = async () => {
      if (open) {
        setIsListsLoading(true);
        try {
          const response = await api.get('/companies');
          setCompanies(response.data.companies || []);
        } catch (error) {
          toast.error("Falha ao carregar la lista de clientes.");
        } finally {
          setIsListsLoading(false);
        }
      }
    };
    fetchCompanies();
  }, [open]);

  useEffect(() => {
    if (open) {
      if (initialData) {
        setFormData({
          companyId: initialData.companyId || '',
          name: initialData.name || '',
          contractNumber: initialData.contractNumber || '',
          startDate: initialData.startDate ? new Date(initialData.startDate) : null,
          endDate: initialData.endDate ? new Date(initialData.endDate) : null,
        });
      } else {
        setFormData({
          companyId: '', name: '', contractNumber: '', startDate: null, endDate: null,
        });
      }
    }
  }, [initialData, open]);

  const handleChange = (id, value) => {
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setIsLoading(true);

    const payload = { ...formData };
    // Remove chaves vazias ou nulas para campos opcionais
    if (!payload.contractNumber) delete payload.contractNumber;
    if (!payload.startDate) delete payload.startDate;
    if (!payload.endDate) delete payload.endDate;

    const success = await onSave(payload);
    setIsLoading(false);
    if (success) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSave}>
          <DialogHeader>
            <DialogTitle>{isEditing ? "Editar" : "Novo"} Contrato</DialogTitle>
            <DialogDescription>
              Preencha os dados do contrato e vincule-o a um cliente.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="companyId">Cliente</Label>
              <Select value={formData.companyId} onValueChange={(value) => handleChange('companyId', value)} disabled={isListsLoading} required>
                  <SelectTrigger><SelectValue placeholder={isListsLoading ? "Carregando..." : "Selecione o cliente"} /></SelectTrigger>
                  <SelectContent>
                    {companies.map(company => (
                      <SelectItem key={company.id} value={company.id}>{company.corporateName}</SelectItem>
                    ))}
                  </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Contrato</Label>
              <Input id="name" value={formData.name} onChange={(e) => handleChange('name', e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contractNumber">Número do Contrato (Opcional)</Label>
              <Input id="contractNumber" value={formData.contractNumber} onChange={(e) => handleChange('contractNumber', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label htmlFor="startDate">Data de Início</Label><Popover><PopoverTrigger asChild><Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !formData.startDate && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{formData.startDate ? format(formData.startDate, "dd/MM/yyyy") : <span>Selecione</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={formData.startDate} onSelect={(date) => handleChange('startDate', date)} locale={ptBR} /></PopoverContent></Popover></div>
              <div className="space-y-2"><Label htmlFor="endDate">Data de Fim</Label><Popover><PopoverTrigger asChild><Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !formData.endDate && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{formData.endDate ? format(formData.endDate, "dd/MM/yyyy") : <span>Selecione</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={formData.endDate} onSelect={(date) => handleChange('endDate', date)} locale={ptBR} /></PopoverContent></Popover></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => onOpenChange(false)} disabled={isLoading}>Cancelar</Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLoading ? "Salvando..." : "Salvar Contrato"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}