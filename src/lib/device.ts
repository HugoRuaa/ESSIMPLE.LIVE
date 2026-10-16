// Token del teléfono vinculado. Lo entrega el servidor al canjear un código de un solo uso
// (rpc vincular_dispositivo). En la base solo existe su hash; aquí queda guardado en claro
// porque el teléfono lo necesita para hablar con el servidor. Se puede revocar desde el panel.
const KEY = 'essimple_device_token';

export const getDeviceToken = (): string | null => {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
};

export const setDeviceToken = (token: string): void => {
  try {
    localStorage.setItem(KEY, token);
  } catch {
    // sin almacenamiento: el teléfono tendrá que vincularse de nuevo
  }
};

export const clearDeviceToken = (): void => {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // nada que borrar
  }
};

/** true cuando este dispositivo es el teléfono de la persona acompañada (tiene token). */
export const isDeviceMode = (): boolean => !!getDeviceToken();
