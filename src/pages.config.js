import Dashboard from './pages/Dashboard';
import AddItem from './pages/AddItem';
import ViewItem from './pages/ViewItem';
import EditItem from './pages/EditItem';
import Multiprompt from './pages/Multiprompt';
import AIBackoffice from './pages/AIBackoffice';
import Subscription from './pages/Subscription';
import Features from './pages/Features';
import AdminSubscription from './pages/AdminSubscription';
import RecycleBin from './pages/RecycleBin';
import Support from './pages/Support';
import AdminStats from './pages/AdminStats';
import AdminSupportTickets from './pages/AdminSupportTickets';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "AddItem": AddItem,
    "ViewItem": ViewItem,
    "EditItem": EditItem,
    "Multiprompt": Multiprompt,
    "AIBackoffice": AIBackoffice,
    "Subscription": Subscription,
    "Features": Features,
    "AdminSubscription": AdminSubscription,
    "RecycleBin": RecycleBin,
    "Support": Support,
    "AdminStats": AdminStats,
    "AdminSupportTickets": AdminSupportTickets,
}

export const pagesConfig = {
    mainPage: "Features",
    Pages: PAGES,
    Layout: __Layout,
};