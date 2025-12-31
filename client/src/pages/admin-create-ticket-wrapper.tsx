import AdminCreateTicket from "./admin-create-ticket";
import { AuthMiddleware } from "@/components/auth-middleware";

// Admin create ticket wrapper with auth checking
export default function AdminCreateTicketWrapper() {
  return (
    <AuthMiddleware adminOnly={true}>
      <AdminCreateTicket />
    </AuthMiddleware>
  );
}