import { useEffect, useState } from 'react';
import { Link, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import Layout from '@/components/layout';
import ProductManagement from '@/components/product-management-simplified';

interface ProductsProps {
  user: any;
}

export default function Products() {
  // Extract all translations and i18n at the top level to avoid hook order issues
  const { t, i18n } = useTranslation();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language); // Track language changes
  
  // Update language state whenever i18n.language changes
  useEffect(() => {

    // Use timestamp to force complete re-render
    setCurrentLanguage(`${i18n.language}-${Date.now()}`);
  }, [i18n.language]);
  
  useEffect(() => {
    async function fetchUser() {
      try {
        const response = await fetch('/api/user', {
          credentials: 'include'
        });
        
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchUser();
  }, []);
  
  // No longer needed since we're using i18n.language directly for keys
  // const [translationKey, setTranslationKey] = useState('');
  // useEffect(() => {
  //   setTranslationKey(t('products.catalog.title'));
  // }, [t]);
  
  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen flex-col">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div>
          <p className="text-muted-foreground">{t('common.loading')}</p>
        </div>
      </Layout>
    );
  }
  
  if (!user) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-screen">
          <h1 className="text-2xl font-bold mb-4">{t('common.pleaseLogin')}</h1>
          <p className="mb-4">{t('common.loginRequired')}</p>
          <Link href="/auth">
            <a className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
              {t('common.goToLogin')}
            </a>
          </Link>
        </div>
      </Layout>
    );
  }
  
  // Use the currentLanguage variable that was declared at the top level
  return (
    <Layout key={`products-page-${currentLanguage}`}>
      <div className="container mx-auto py-6 text-content">
        {/* Add custom title above the component that directly uses i18n.t() */}
        <div className="mb-6 products-page-header">
          <h1 className="text-3xl font-bold mb-2">
            {i18n.t('productsData.pageTitle', { lng: currentLanguage.split('-')[0] })}
          </h1>
          <p className="text-muted-foreground">
            {i18n.t('productsData.pageDescription', { lng: currentLanguage.split('-')[0] })}
          </p>
        </div>
        <ProductManagement key={`product-component-${currentLanguage}`} />
      </div>
    </Layout>
  );
}