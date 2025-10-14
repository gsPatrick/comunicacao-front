"use client"

import Link from 'next/link';
import { UserPlus, UserMinus, Repeat, MapPin } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../../components/ui/card';
import { useAuth } from '../../../../hooks/useAuth';
import { Skeleton } from '../../../../components/ui/skeleton';

const requestTypes = [
  {
    href: "/solicitacoes/nova/admissao",
    title: "Admissão",
    description: "Iniciar o processo para contratar um novo colaborador.",
    icon: UserPlus,
    profiles: ['ADMIN', 'RH', 'GESTAO', 'SOLICITANTE'],
  },
  {
    href: "/solicitacoes/nova/desligamento",
    title: "Desligamento",
    description: "Formalizar o desligamento de um colaborador.",
    icon: UserMinus,
    profiles: ['ADMIN', 'RH', 'GESTAO', 'SOLICITANTE'],
  },
  {
    href: "/solicitacoes/nova/substituicao",
    title: "Substituição",
    description: "Solicitar a substituição de um colaborador existente.",
    icon: Repeat,
    profiles: ['ADMIN', 'RH', 'GESTAO', 'SOLICITANTE'],
  },
  {
    href: "/solicitacoes/nova/troca-de-local",
    title: "Troca de Local",
    description: "Solicitar a mudança de local de um colaborador.",
    icon: MapPin,
    profiles: ['ADMIN', 'RH', 'GESTAO', 'SOLICITANTE'],
  },
];

export default function NovaSolicitacaoPage() {
  const { user } = useAuth();

  // Exibe um esqueleto de carregamento enquanto o perfil do usuário é verificado
  if (!user) {
    return (
        <div className="container mx-auto py-2">
            <div className="mb-8 text-center">
                <Skeleton className="h-8 w-64 mx-auto" />
                <Skeleton className="h-4 w-96 mx-auto mt-4" />
            </div>
            {/* --- MUDANÇA APLICADA TAMBÉM NO SKELETON PARA CONSISTÊNCIA --- */}
            <div className="grid gap-6 sm:grid-cols-2 max-w-3xl mx-auto">
                <Skeleton className="h-40 w-full" />
                <Skeleton className="h-40 w-full" />
                <Skeleton className="h-40 w-full" />
                <Skeleton className="h-40 w-full" />
            </div>
        </div>
    );
  }

  const availableRequestTypes = requestTypes.filter(type => type.profiles.includes(user.profile));

  return (
    <div className="container mx-auto py-2">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold">Nova Solicitação</h1>
        <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">
          Selecione o tipo de solicitação que deseja iniciar. Cada processo seguirá um fluxo específico definido pelo RH.
        </p>
      </div>

      {/* --- MUDANÇA PRINCIPAL APLICADA AQUI --- */}
      <div className="grid gap-6 sm:grid-cols-2 max-w-3xl mx-auto">
        {availableRequestTypes.map((type) => (
          <Link href={type.href} key={type.title} className="focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-lg">
            <Card className="h-full hover:border-primary hover:shadow-lg transition-all cursor-pointer">
              <CardHeader className="flex flex-row items-center gap-4">
                <div className="p-3 bg-muted rounded-lg">
                  <type.icon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle>{type.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>{type.description}</CardDescription>
              </CardContent>
            </Card>
          </Link>
        ))}

        {/* Mensagem exibida caso o perfil do usuário não tenha permissão para criar nenhuma solicitação */}
        {availableRequestTypes.length === 0 && (
            <div className="col-span-full text-center text-muted-foreground p-8 border-2 border-dashed rounded-lg">
                <p>Nenhum tipo de solicitação disponível para o seu perfil.</p>
                <p className="text-sm mt-1">Entre em contato com o administrador do sistema se acreditar que isso é um erro.</p>
            </div>
        )}
      </div>
    </div>
  );
}