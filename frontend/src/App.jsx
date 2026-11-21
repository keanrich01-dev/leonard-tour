import { useEffect, useState } from 'react';
import Home from './pages/Home.jsx';
import PackageDetailsPage from './pages/PackageDetailsPage.jsx';
import PaymentResultPage from './pages/PaymentResultPage.jsx';
import CategoryPage from './pages/CategoryPage.jsx';
import AdminApp from './admin/AdminApp.jsx';
import { AboutPage, AccommodationPage, BlogsPage, BlogArticlePage, ContactPage, DestinationPage, TripPlannerPage } from './pages/SitePages.jsx';

function readRoute() {
  const path = window.location.pathname.replace(/\/+$/, '') || '/';
  if (path === '/admin' || path.startsWith('/admin/')) return { type: 'admin' };
  if (path === '/about-us') return { type: 'about' };
  if (path === '/accommodation') return { type: 'accommodation' };
  if (path === '/blogs') return { type: 'blogs' };
  if (path === '/contact-us') return { type: 'contact' };
  if (path === '/plan-your-safari') return { type: 'planner' };
  const destinationMatch = path.match(/^\/destinations\/([^/]+)$/);
  if (destinationMatch) return { type: 'destination', slug: decodeURIComponent(destinationMatch[1]) };
  const blogMatch = path.match(/^\/blogs\/([^/]+)$/);
  if (blogMatch) return { type: 'blog-article', slug: decodeURIComponent(blogMatch[1]) };
  const categoryRoutes = {
    '/safaris/camping': 'camping',
    '/safaris/mid-range': 'midrange',
    '/safaris/luxury': 'luxury',
    '/safaris/serengeti-migration': 'migration',
    '/climbing/kilimanjaro': 'kilimanjaro',
    '/climbing/meru': 'meru',
    '/island-escapes': 'islands',
  };
  if (categoryRoutes[path]) return { type: 'category', categoryKey: categoryRoutes[path] };

  const packageMatch = path.match(/^\/packages\/([^/]+)$/);
  if (packageMatch) return { type: 'package', slug: decodeURIComponent(packageMatch[1]) };

  const paymentMatch = path.match(/^\/booking\/([^/]+)\/payment-result$/);
  if (paymentMatch) return { type: 'payment-result', reference: decodeURIComponent(paymentMatch[1]) };

  return { type: 'home' };
}

export default function App() {
  const [route, setRoute] = useState(readRoute);

  useEffect(() => {
    const handleLocationChange = () => setRoute(readRoute());
    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  if (route.type === 'admin') return <AdminApp />;
  if (route.type === 'package') return <PackageDetailsPage key={route.slug} slug={route.slug} />;
  if (route.type === 'payment-result') return <PaymentResultPage key={route.reference} reference={route.reference} />;
  if (route.type === 'category') return <CategoryPage key={route.categoryKey} categoryKey={route.categoryKey} />;
  if (route.type === 'about') return <AboutPage />;
  if (route.type === 'accommodation') return <AccommodationPage />;
  if (route.type === 'blogs') return <BlogsPage />;
  if (route.type === 'blog-article') return <BlogArticlePage slug={route.slug} />;
  if (route.type === 'contact') return <ContactPage />;
  if (route.type === 'planner') return <TripPlannerPage />;
  if (route.type === 'destination') return <DestinationPage key={route.slug} slug={route.slug} />;
  return <Home />;
}
