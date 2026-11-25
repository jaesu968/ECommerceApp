import { useParams } from 'react-router-dom';
// import CSS here

const OrderDetails = () => {
    const { id } = useParams(); // the route is /orders/:id
    return (
        <>
        <h1>
            Order Details Page
        </h1>
        <h1>Order: {id}</h1>
        </>
    )
}

export default OrderDetails;