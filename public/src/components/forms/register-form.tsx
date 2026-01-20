"use client";

import { useActionState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { registerAction } from "@/actions/auth";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/logo";

export function RegisterForm() {
  const [state, formAction, isPending] = useActionState(registerAction, null);
  const router = useRouter();

  useEffect(() => {
    if (state?.success && state?.redirectTo) {
      router.replace(state.redirectTo);
    }
  }, [state, router]);

  return (
    <Card className="bg-app-card border border-app-border w-full max-w-md mx-auto">
      <CardHeader>
        <div className="flex justify-center">
          <Logo width={140} height={46} className="h-12 sm:h-14 w-auto" />
        </div>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" action={formAction}>
          <div className="space-y-2">
            <Label htmlFor="name" className="text-black">
              Nome
            </Label>
            <Input
              type="text"
              id="name"
              name="name"
              placeholder="Digite seu nome"
              required
              minLength={3}
              className="text-black bg-app-card border border-app-border"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-black">
              Email
            </Label>
            <Input
              type="email"
              id="email"
              name="email"
              placeholder="Digite seu email..."
              required
              className="text-black bg-app-card border border-app-border"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-black">
              Senha
            </Label>
            <Input
              type="password"
              id="password"
              name="password"
              placeholder="Digite sua senha..."
              required
              className="text-black bg-app-card border border-app-border"
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-brand-primary text-black hover:bg-brand-primary"
          >
            {isPending ? "Criando conta..." : "Criar conta"}
          </Button>

          <p className="text-center text-sm text-gray-100">
            Já tem uma conta?{" "}
            <Link href="/login" className="text-brand-primary font-normal">
              Faça o login
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
