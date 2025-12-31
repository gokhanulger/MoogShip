import Layout from "@/components/layout";

export default function DebugAdminPage() {
  console.log('🔥 DEBUG ADMIN PAGE LOADED');
  
  return (
    <Layout>
      <div style={{ 
        backgroundColor: 'lime', 
        color: 'black', 
        padding: '50px', 
        fontSize: '30px', 
        fontWeight: 'bold',
        border: '10px solid red',
        textAlign: 'center',
        margin: '20px'
      }}>
        🔥 DEBUG ADMIN PAGE IS WORKING! 🔥
      </div>
      
      <div style={{ padding: '20px', backgroundColor: 'yellow' }}>
        <h1>This is a test page to verify routing works</h1>
        <p>If you can see this, routing is working correctly</p>
      </div>
    </Layout>
  );
}