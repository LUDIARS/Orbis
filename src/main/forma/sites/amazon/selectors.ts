export const amazonSelectors = {
  title: '#productTitle', price: '#priceblock_ourprice, #priceblock_dealprice, .a-price .a-offscreen',
  rating: '#acrPopover', reviewCount: '#acrCustomerReviewText', delivery: '#mir-layout-DELIVERY_BLOCK-slot-PRIMARY_DELIVERY_MESSAGE_LARGE, #deliveryBlockMessage',
  sponsored: '[data-component-type="sp-sponsored-result"], .AdHolder, .s-sponsored-label-info-icon'
} as const
