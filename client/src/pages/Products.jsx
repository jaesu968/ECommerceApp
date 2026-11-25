// import CSS here
import { Link } from 'react-router-dom';

const Products = () => {
    return (
        <>
        <h1>
            Products Page
        </h1>
        <p><Link to="/products/1">Test product (temporary)</Link></p>
        </>
    )
}

export default Products;