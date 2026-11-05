const KEY = 'ld_client_token';

export const getClientToken = (): string | null => sessionStorage.getItem(KEY);

export const setClientToken = (token: string): void => sessionStorage.setItem(KEY, token);

export const clearClientToken = (): void => sessionStorage.removeItem(KEY);