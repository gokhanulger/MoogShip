import { AnnouncementManagement } from "@/components/announcement-management";
import { withAuth } from "@/lib/with-auth";
import Layout from "@/components/layout";

function AnnouncementsPage() {
  return (
    <Layout>
      <div className="container mx-auto py-6">
        <AnnouncementManagement />
      </div>
    </Layout>
  );
}

export default withAuth(AnnouncementsPage, true);