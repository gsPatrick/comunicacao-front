"use client"

import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Loader2, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale'; // <-- 1. IMPORTAÇÃO DA LOCALIDADE
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
  
  const [lists, setLists] = useState({ positions: [], contracts: [], workLocations: [] });
  const [isListsLoading, setIsListsLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: '', cpf: '', registration: '', admissionDate: null, category: '',
    positionId: '', contractId: '', workLocationId: '',
  });

  useEffect(() => {
    const fetchLists = async () => {
      if (open) {
        setIsListsLoading(true);
        try {
          const [positionsRes, contractsRes, workLocationsRes] = await Promise.all([
            api.get('/positions?all=true'), // Garantir que todos os dados sejam retornados
            api.get('/contracts?all=true'),
            api.get('/work-locations?all=true')
          ]);
          setLists({
            positions: positionsRes.data.positions || [],
            contracts: contractsRes.data.contracts || [],
            workLocations: workLocationsRes.data.workLocations || [],
          });
        } catch (error) {
          toast.error("Não foi possível carregar os dados de apoio.");
        } finally {
          setIsListsLoading(false);
        }
      }
    };
    fetchLists();
  }, [open]);

  useEffect(() => {
    if (open) {
      if (initialData) {
        setFormData({
          name: initialData.name || '',
          cpf: initialData.cpf || '',
          registration: initialData.registration || '',
          admissionDate: initialData.admissionDate ? new Date(initialData.admissionDate) : null,
          category: initialData.category || '',
          positionId: initialData.positionId || '',
          contractId: initialData.contractId || '',
          workLocationId: initialData.workLocationId || '',
        });
      } else {
        setFormData({
          name: '', cpf: '', registration: '', admissionDate: new Date(), category: '',
          positionId: '', contractId: '', workLocationId: '',
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
    if (!payload.category) delete payload.category;

    const success = await onSave(payload);
    setIsLoading(false);
    if (success) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <form onSubmit={handleSave}>
          <DialogHeader>
            <DialogTitle>{isEditing ? "Editar" : "Adicionar Novo"} Colaborador</DialogTitle>
            <DialogDescription>Preencha os dados do colaborador. Clique em salvar para concluir.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-6">
              <div className="space-y-2"><Label htmlFor="name">Nome Completo</Label><Input id="name" value={formData.name} onChange={(e) => handleChange('name', e.target.value)} required/></div>
              <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label htmlFor="cpf">CPF</Label><Input id="cpf" value={formData.cpf} onChange={(e) => handleChange('cpf', e.target.value)} required/></div>
                  <div className="space-y-2"><Label htmlFor="registration">Matrícula</Label><Input id="registration" value={formData.registration} onChange={(e) => handleChange('registration', e.target.value)} required/></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="admissionDate">Data de Admissão</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !formData.admissionDate && "text-muted-foreground")}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {/* --- 2. FORMATAÇÃO DA DATA EM PORTUGUÊS --- */}
                          {formData.admissionDate ? format(formData.admissionDate, "dd/MM/yyyy") : <span>Selecione</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        {/* --- 3. ADIÇÃO DA LOCALIDADE AO CALENDÁRIO --- */}
                        <Calendar 
                          mode="single" 
                          selected={formData.admissionDate} 
                          onSelect={(date) => handleChange('admissionDate', date)} 
                          initialFocus 
                          locale={ptBR} 
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
              </div>
              <div className="space-y-2">
                  <Label htmlFor="positionId">Cargo</Label>
                   <Select value={formData.positionId} onValueChange={(value) => handleChange('positionId', value)} disabled={isListsLoading} required>
                      <SelectTrigger><SelectValue placeholder={isListsLoading ? "Carregando..." : "Selecione um cargo"} /></SelectTrigger>
                      <SelectContent>{lists.positions.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                  </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                      <Label htmlFor="contractId">Contrato</Label>
                       <Select value={formData.contractId} onValueChange={(value) => handleChange('contractId', value)} disabled={isListsLoading} required>
                          <SelectTrigger><SelectValue placeholder={isListsLoading ? "Carregando..." : "Selecione"} /></SelectTrigger>
                          <SelectContent>{lists.contracts.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                      </Select>
                  </div>
                   <div className="space-y-2">
                      <Label htmlFor="workLocationId">Local de Trabalho</Label>
                       <Select value={formData.workLocationId} onValueChange={(value) => handleChange('workLocationId', value)} disabled={isListsLoading} required>
                          <SelectTrigger><SelectValue placeholder={isListsLoading ? "Carregando..." : "Selecione"} /></SelectTrigger>
                          <SelectContent>{lists.workLocations.map(wl => <SelectItem key={wl.id} value={wl.id}>{wl.name}</SelectItem>)}</SelectContent>
                      </Select>
                  </div>
              </div>
          </div>
          <DialogFooter className="border-t pt-4">
            <Button variant="outline" type="button" onClick={() => onOpenChange(false)} disabled={isLoading}>Cancelar</Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLoading ? "Salvando..." : "Salvar Colaborador"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}