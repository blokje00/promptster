/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import AIBackoffice from './pages/AIBackoffice';
import AddItem from './pages/AddItem';
import AdminAnalytics from './pages/AdminAnalytics';
import AdminSettings from './pages/AdminSettings';
import AdminStats from './pages/AdminStats';
import AdminSupportTickets from './pages/AdminSupportTickets';
import Checks from './pages/Checks';
import Dashboard from './pages/Dashboard';
import EditItem from './pages/EditItem';
import Features from './pages/Features';
import Layout from './pages/Layout';
import Legal from './pages/Legal';
import Multiprompt from './pages/Multiprompt';
import RecycleBin from './pages/RecycleBin';
import Support from './pages/Support';
import ViewItem from './pages/ViewItem';
import index from './pages/index';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AIBackoffice": AIBackoffice,
    "AddItem": AddItem,
    "AdminAnalytics": AdminAnalytics,
    "AdminSettings": AdminSettings,
    "AdminStats": AdminStats,
    "AdminSupportTickets": AdminSupportTickets,
    "Checks": Checks,
    "Dashboard": Dashboard,
    "EditItem": EditItem,
    "Features": Features,
    "Layout": Layout,
    "Legal": Legal,
    "Multiprompt": Multiprompt,
    "RecycleBin": RecycleBin,
    "Support": Support,
    "ViewItem": ViewItem,
    "index": index,
}

export const pagesConfig = {
    mainPage: "Multiprompt",
    Pages: PAGES,
    Layout: __Layout,
};