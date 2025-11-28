import Dashboard from './pages/Dashboard';
import AddItem from './pages/AddItem';
import ViewItem from './pages/ViewItem';
import EditItem from './pages/EditItem';
import Multiprompt from './pages/Multiprompt';
import AIBackoffice from './pages/AIBackoffice';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "AddItem": AddItem,
    "ViewItem": ViewItem,
    "EditItem": EditItem,
    "Multiprompt": Multiprompt,
    "AIBackoffice": AIBackoffice,
}

export const pagesConfig = {
    mainPage: "Multiprompt",
    Pages: PAGES,
    Layout: __Layout,
};