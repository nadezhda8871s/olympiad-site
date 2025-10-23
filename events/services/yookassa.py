import uuid
import logging
from decimal import Decimal
from typing import Optional, Dict, Any
from django.conf import settings
from yookassa import Configuration, Payment
from yookassa.domain.exceptions import ApiError, BadRequestError, UnauthorizedError

logger = logging.getLogger(__name__)

# Configure YooKassa
Configuration.account_id = settings.YOOKASSA_SHOP_ID
Configuration.secret_key = settings.YOOKASSA_SECRET_KEY


class YooKassaService:
    """Service for working with YooKassa payment system"""

    @staticmethod
    def create_payment(
        amount: Decimal,
        description: str,
        return_url: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Create payment in YooKassa
        
        Args:
            amount: Payment amount
            description: Payment description
            return_url: URL to redirect after payment
            metadata: Additional payment data
            
        Returns:
            Dictionary with payment data or None if error
        """
        if not settings.YOOKASSA_SHOP_ID or not settings.YOOKASSA_SECRET_KEY:
            logger.error('YooKassa credentials not configured')
            return None

        try:
            idempotence_key = str(uuid.uuid4())
            
            payment_data = {
                'amount': {
                    'value': str(amount),
                    'currency': 'RUB'
                },
                'confirmation': {
                    'type': 'redirect',
                    'return_url': return_url
                },
                'capture': True,
                'description': description,
            }
            
            if metadata:
                payment_data['metadata'] = metadata

            payment = Payment.create(payment_data, idempotence_key)
            
            logger.info(f'Payment created: {payment.id}')
            
            return {
                'id': payment.id,
                'status': payment.status,
                'confirmation_url': payment.confirmation.confirmation_url,
                'amount': payment.amount.value,
                'currency': payment.amount.currency,
                'created_at': payment.created_at,
            }
            
        except UnauthorizedError as e:
            logger.error(f'YooKassa authentication error: {str(e)}')
            return None
        except BadRequestError as e:
            logger.error(f'YooKassa bad request: {str(e)}')
            return None
        except ApiError as e:
            logger.error(f'YooKassa API error: {str(e)}')
            return None
        except Exception as e:
            logger.error(f'Unexpected error creating payment: {str(e)}')
            return None

    @staticmethod
    def get_payment(payment_id: str) -> Optional[Dict[str, Any]]:
        """
        Get payment information
        
        Args:
            payment_id: Payment ID in YooKassa
            
        Returns:
            Dictionary with payment data or None if error
        """
        try:
            payment = Payment.find_one(payment_id)
            
            return {
                'id': payment.id,
                'status': payment.status,
                'amount': payment.amount.value,
                'currency': payment.amount.currency,
                'paid': payment.paid,
                'created_at': payment.created_at,
                'metadata': payment.metadata,
            }
            
        except ApiError as e:
            logger.error(f'Error getting payment {payment_id}: {str(e)}')
            return None
        except Exception as e:
            logger.error(f'Unexpected error getting payment {payment_id}: {str(e)}')
            return None

    @staticmethod
    def cancel_payment(payment_id: str) -> bool:
        """
        Cancel payment
        
        Args:
            payment_id: Payment ID in YooKassa
            
        Returns:
            True if cancelled successfully, False otherwise
        """
        try:
            payment = Payment.find_one(payment_id)
            
            if payment.status == 'pending':
                Payment.cancel(payment_id)
                logger.info(f'Payment {payment_id} cancelled')
                return True
            else:
                logger.warning(f'Cannot cancel payment {payment_id} with status {payment.status}')
                return False
                
        except ApiError as e:
            logger.error(f'Error cancelling payment {payment_id}: {str(e)}')
            return False
        except Exception as e:
            logger.error(f'Unexpected error cancelling payment {payment_id}: {str(e)}')
            return False
