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
import { lazy } from 'react';
const AIBackoffice = lazy(() => import('./pages/AIBackoffice'));
const AddItem = lazy(() => import('./pages/AddItem'));
const AdminAnalytics = lazy(() => import('./pages/AdminAnalytics'));
const AdminSettings = lazy(() => import('./pages/AdminSettings'));
const AdminStats = lazy(() => import('./pages/AdminStats'));
const AdminSupportTickets = lazy(() => import('./pages/AdminSupportTickets'));
const Checks = lazy(() => import('./pages/Checks'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const EditItem = lazy(() => import('./pages/EditItem'));
const Features = lazy(() => import('./pages/Features'));
const Layout = lazy(() => import('./pages/Layout'));
const Legal = lazy(() => import('./pages/Legal'));
const Multiprompt = lazy(() => import('./pages/Multiprompt'));
const RecycleBin = lazy(() => import('./pages/RecycleBin'));
const Support = lazy(() => import('./pages/Support'));
const ViewItem = lazy(() => import('./pages/ViewItem'));
const index = lazy(() => import('./pages/index'));
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