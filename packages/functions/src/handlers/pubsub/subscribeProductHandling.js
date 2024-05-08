import {updatePointsCustomerByViaReviewTransactions} from '../../repositories/customerRepository';

export default async function subscribeProductHandling(message) {
    try {
        const data = JSON.parse(Buffer.from(message.data, 'base64').toString());
    } catch (e) {
        console.error(e);
    }
}
