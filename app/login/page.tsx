"use client";
import { useRouter } from "next/navigation";
import { LoginScreen } from "@/components/screens/Login";

export default function LoginPage() {
  const router = useRouter();
  return <LoginScreen onLogin={() => router.replace("/")}/>;
}
