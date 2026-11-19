import { describe, expect, it } from 'vitest';
import { lim, validarCedula, validarNombre } from './validaciones';

describe('lim()', () => {
  it('quita los espacios de los extremos (trim) y pasa a mayúsculas', () => {
    expect(lim('  laura prueba  ')).toBe('LAURA PRUEBA');
  });

  it('deja un solo espacio entre palabras', () => {
    expect(lim('ana    maría\tnúñez')).toBe('ANA MARÍA NÚÑEZ');
  });

  it('conserva tildes, ñ y ü en mayúscula', () => {
    expect(lim('peña güiza')).toBe('PEÑA GÜIZA');
  });

  it('una cédula con espacios alrededor queda solo con los dígitos', () => {
    expect(lim(' 1000000001 ')).toBe('1000000001');
  });

  it('texto vacío o solo espacios queda vacío', () => {
    expect(lim('')).toBe('');
    expect(lim('    ')).toBe('');
  });
});

describe('validaciones', () => {
  it('nombre: acepta letras y espacios, rechaza números', () => {
    expect(validarNombre(lim(' ana maría '))).toBeNull();
    expect(validarNombre('ANA 2')).toContain('solo lleva letras');
    expect(validarNombre('   ')).toContain('Escribe el nombre completo');
  });

  it('cédula: entre 5 y 20 dígitos', () => {
    expect(validarCedula('1000000001')).toBeNull();
    expect(validarCedula('123')).toContain('entre 5 y 20');
    expect(validarCedula('')).toContain('Escribe tu cédula');
  });
});
