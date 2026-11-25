import { createBrowserRouter,
         createRoutesFromElements,
         Route,
         RouterProvider  } from 'react-router-dom'
import Home from './pages/Home'
import Layout from './components/Layout'
import Products from "./pages/Products"
import ProductDetails from './pages/ProductDetails'
import Login from './pages/Login'
import Register from './pages/Register'
import Cart from './pages/Cart'
import Checkout from './pages/Checkout'
import Orders from './pages/Orders'
import OrderDetails from './pages/OrderDetails'
import NotFound from './pages/NotFound'

  const appRouter = createBrowserRouter(createRoutesFromElements(
    <Route element={<Layout />}>
      <Route index element={ <Home />}></Route>
      <Route path="products" element={<Products />}></Route>
      <Route path="products/:id" element={<ProductDetails />}></Route>
      <Route path="login" element={<Login />}></Route>
      <Route path="register" element={<Register />}></Route>
      <Route path="cart" element={<Cart />}></Route>
      <Route path="checkout" element={<Checkout />}></Route>
      <Route path="orders" element={<Orders />}></Route>
      <Route path="orders/:id" element={<OrderDetails />}></Route>
      <Route path="*" element={<NotFound />}></Route>
    </Route>

  ))

function App() {

  return (
    <RouterProvider router={appRouter} />
  )
}

export default App
