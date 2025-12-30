import Layout from "./Layout.jsx";

import AIBackoffice from "./AIBackoffice";

import AddItem from "./AddItem";

import AdminAnalytics from "./AdminAnalytics";

import AdminStats from "./AdminStats";

import AdminSubscription from "./AdminSubscription";

import AdminSupportTickets from "./AdminSupportTickets";

import Checks from "./Checks";

import Dashboard from "./Dashboard";

import EditItem from "./EditItem";

import Features from "./Features";

import Legal from "./Legal";

import Multiprompt from "./Multiprompt";

import NoCodeRanking from "./NoCodeRanking";

import RecycleBin from "./RecycleBin";

import Subscription from "./Subscription";

import Support from "./Support";

import ViewItem from "./ViewItem";

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

const PAGES = {
    
    AIBackoffice: AIBackoffice,
    
    AddItem: AddItem,
    
    AdminAnalytics: AdminAnalytics,
    
    AdminStats: AdminStats,
    
    AdminSubscription: AdminSubscription,
    
    AdminSupportTickets: AdminSupportTickets,
    
    Checks: Checks,
    
    Dashboard: Dashboard,
    
    EditItem: EditItem,
    
    Features: Features,
    
    Legal: Legal,
    
    Multiprompt: Multiprompt,
    
    NoCodeRanking: NoCodeRanking,
    
    RecycleBin: RecycleBin,
    
    Subscription: Subscription,
    
    Support: Support,
    
    ViewItem: ViewItem,
    
}

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || Object.keys(PAGES)[0];
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);
    
    return (
        <Layout currentPageName={currentPage}>
            <Routes>            
                
                    <Route path="/" element={<AIBackoffice />} />
                
                
                <Route path="/AIBackoffice" element={<AIBackoffice />} />
                
                <Route path="/AddItem" element={<AddItem />} />
                
                <Route path="/AdminAnalytics" element={<AdminAnalytics />} />
                
                <Route path="/AdminStats" element={<AdminStats />} />
                
                <Route path="/AdminSubscription" element={<AdminSubscription />} />
                
                <Route path="/AdminSupportTickets" element={<AdminSupportTickets />} />
                
                <Route path="/Checks" element={<Checks />} />
                
                <Route path="/Dashboard" element={<Dashboard />} />
                
                <Route path="/EditItem" element={<EditItem />} />
                
                <Route path="/Features" element={<Features />} />
                
                <Route path="/Legal" element={<Legal />} />
                
                <Route path="/Multiprompt" element={<Multiprompt />} />
                
                <Route path="/NoCodeRanking" element={<NoCodeRanking />} />
                
                <Route path="/RecycleBin" element={<RecycleBin />} />
                
                <Route path="/Subscription" element={<Subscription />} />
                
                <Route path="/Support" element={<Support />} />
                
                <Route path="/ViewItem" element={<ViewItem />} />
                
            </Routes>
        </Layout>
    );
}

export default function Pages() {
    return (
        <Router>
            <PagesContent />
        </Router>
    );
}