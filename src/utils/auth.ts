import { hash, compare } from 'bcryptjs';

/**
 * Hashea una contraseña utilizando bcryptjs
 * @param password Contraseña en texto plano
 * @returns Contraseña hasheada
 */
export async function hashPassword(password: string): Promise<string> {
  return await hash(password, 12);
}

/**
 * Verifica si una contraseña coincide con su hash
 * @param password Contraseña en texto plano
 * @param hashedPassword Hash de la contraseña almacenada
 * @returns true si la contraseña coincide, false en caso contrario
 */
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return await compare(password, hashedPassword);
}