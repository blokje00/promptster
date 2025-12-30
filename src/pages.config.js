import AIBackoffice from './pages/AIBackoffice';
import AddItem from './pages/AddItem';
import AdminAnalytics from './pages/AdminAnalytics';
import AdminStats from './pages/AdminStats';
import AdminSubscription from './pages/AdminSubscription';
import AdminSupportTickets from './pages/AdminSupportTickets';
import Checks from './pages/Checks';
import Dashboard from './pages/Dashboard';
import EditItem from './pages/EditItem';
import Legal from './pages/Legal';
import Multiprompt from './pages/Multiprompt';
import NoCodeRanking from './pages/NoCodeRanking';
import RecycleBin from './pages/RecycleBin';
import Subscription from './pages/Subscription';
import Support from './pages/Support';
import ViewItem from './pages/ViewItem';
import index from './pages/index';
import Features from './pages/Features';
import AnalyticsTest from './pages/AnalyticsTest';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AIBackoffice": AIBackoffice,
    "AddItem": AddItem,
    "AdminAnalytics": AdminAnalytics,
    "AdminStats": AdminStats,
    "AdminSubscription": AdminSubscription,
    "AdminSupportTickets": AdminSupportTickets,
    "Checks": Checks,
    "Dashboard": Dashboard,
    "EditItem": EditItem,
    "Legal": Legal,
    "Multiprompt": Multiprompt,
    "NoCodeRanking": NoCodeRanking,
    "RecycleBin": RecycleBin,
    "Subscription": Subscription,
    "Support": Support,
    "ViewItem": ViewItem,
    "index": index,
    "Features": Features,
    "AnalyticsTest": AnalyticsTest,
}

export const pagesConfig = {
    mainPage: "Features",
    Pages: PAGES,
    Layout: __Layout,
};