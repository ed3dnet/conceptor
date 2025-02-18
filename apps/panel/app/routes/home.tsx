import type { Route } from "./+types/home";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export default function Home() {
  return (
    <div className="p-4">
      <h1>Welcome to Conceptor</h1>
      <p>Please specify your tenant URL to continue.</p>
    </div>
  );
}
