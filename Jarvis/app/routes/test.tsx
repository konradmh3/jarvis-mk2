import type { Route } from "./+types/home";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "test route" },
    { name: "description", content: "route test" },
  ];
}

export default function Test() {
  return <>Test: Test route complete: ✅</>;
}