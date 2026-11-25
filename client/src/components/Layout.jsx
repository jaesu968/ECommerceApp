import { Outlet } from 'react-router-dom'; // placeholder that React Router fills with whichever page matches the URL.
import Header from './Header'
import Footer from './Footer'

 const PageLayout = () => {
    return (
        <>
            <Header></Header>
            <main>
                <Outlet />
            </main>
            <Footer></Footer>
        </>
    )
 }

 export default PageLayout;