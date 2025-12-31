import AdminTickets from "./admin-tickets";
import { AuthMiddleware } from "@/components/auth-middleware";

// Admin tickets wrapper with direct auth checking
export default function AdminTicketsWrapper() {
  return (
    <AuthMiddleware adminOnly={true}>
      <AdminTickets />
    </AuthMiddleware>
  );
}