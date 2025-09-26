"use client";
import LoginForm from "@/components/auth/LoginForm";
import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLoginStore } from "@/stores/auth.store";
import { Suspense } from "react";
import MovedMessage from "@/components/auth/MovedMessage";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated } = useLoginStore();

  useEffect(() => {
    if (isAuthenticated) {
      const redirectTo = searchParams.get("from") || "/dashboard";
      router.replace(redirectTo);
    }
  }, [isAuthenticated, router, searchParams]);

  return <LoginForm />;
}

export default function LoginPage() {
  return <MovedMessage />;
}