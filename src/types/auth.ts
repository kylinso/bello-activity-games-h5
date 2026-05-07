export interface StoreProfile {
  id: string;
  name: string;
  countryCity: string;
  address: string;
  coverUrl?: string;
  activityId?: string;
  sessionId?: string;
}

export interface MerchantStoreRecord {
  id: string;
  storeName?: string;
  countryName?: string;
  provinceName?: string;
  cityName?: string;
  storeAddressPath?: string;
  storeAddressDetail?: string;
  storeLogo?: string;
  storeGalleryList?: string | string[];
  storeGalleryList5?: string | string[];
}

export interface LoginCodeRequest {
  countryCode: string;
  phone: string;
}

export interface LoginWithCodeRequest extends LoginCodeRequest {
  verificationCode: string;
  cfTurnstileResponse: string;
}

export interface LoginWithPasswordRequest extends LoginCodeRequest {
  password: string;
  cfTurnstileResponse: string;
}

export interface LoginResponse {
  token: string;
  tokenExpiresAt?: string;
  countryCode: string;
  phone: string;
  stores: StoreProfile[];
  activityId?: string;
  sessionId?: string;
}

export interface StoredAuthState extends LoginResponse {
  selectedStore?: StoreProfile;
}
