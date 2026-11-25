import { useParams } from 'react-router-dom';
// import CSS here


const ProductDetails = () => {
    const { id } = useParams(); // the route is /products/:id
    return (
        <>
        <h1>
            Product Details Page
        </h1>
        <h1>Product: {id}</h1>
        </>
    )
}

export default ProductDetails;