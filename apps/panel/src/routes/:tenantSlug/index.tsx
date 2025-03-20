import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function LandingPage() {
  const [tenantSlug, setTenantSlug] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (tenantSlug.trim()) {
      navigate(`/${tenantSlug.trim()}`);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-base-200">
      <div className="card w-96 bg-base-100 shadow-xl">
        <div className="card-body">
          <h1 className="card-title text-2xl text-center">
            Welcome to Conceptor
          </h1>
          <p className="text-center py-4">Enter your tenant name to continue</p>

          <form onSubmit={handleSubmit}>
            <div className="form-control">
              <input
                type="text"
                placeholder="Tenant name"
                className="input input-bordered w-full"
                value={tenantSlug}
                onChange={(e) => setTenantSlug(e.target.value)}
              />
            </div>

            <div className="form-control mt-4">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={!tenantSlug.trim()}
              >
                Continue
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
