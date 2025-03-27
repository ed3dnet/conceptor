import { useNavigate } from "react-router-dom";

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-base-200">
      <div className="card w-96 bg-base-100 shadow-xl">
        <div className="card-body">
          <h1 className="card-title text-2xl text-center">Page Not Found</h1>
          <p className="text-center py-4">
            The page you're looking for doesn't exist.
          </p>

          <button className="btn btn-primary" onClick={() => navigate("/")}>
            Return to Home
          </button>
        </div>
      </div>
    </div>
  );
}
