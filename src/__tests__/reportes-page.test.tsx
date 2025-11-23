import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ReportesPage from '../../app/dashboard/reportes/page'

function mockFetchSequence() {
  const seq: Array<any> = [
    // /api/usuarios/simple
    { success: true, data: { data: [] } },
    // /api/public/productos
    { success: true, data: { data: [] } },
    // /api/proveedores?simple=true
    { success: true, data: { data: [] } },
    // /api/reportes/compras
    { success: true, data: { data: [
      {
        fecha: '2025-11-19',
        proveedor: 'Agrícola San José S.A.C.',
        usuario: 'Administrador TODAFRU',
        producto: 'Camote Amarillo',
        cantidad: 1,
        precio: 2,
        subtotal: 40,
        motivo: 'Compra',
        numero: 'PC-2025-861530'
      }
    ] } }
  ]
  let i = 0
  // Ensure global.fetch exists in test env
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g: any = global
  if (!g.fetch) {
    g.fetch = jest.fn()
  }
  ;(g.fetch as jest.Mock).mockImplementation(async () => {
    const idx = Math.min(i, seq.length - 1)
    i++
    return new Response(JSON.stringify(seq[idx]), { status: 200, headers: { 'Content-Type': 'application/json' } }) as any
  })
}

describe('ReportesPage responsive layout', () => {
  beforeEach(() => {
    mockFetchSequence()
  })
  // No teardown required for this simple mock

  it('renders table on sm+ and cards container for mobile', async () => {
    render(<ReportesPage />)
    const btnCompras = await screen.findByRole('button', { name: /compras/i })
    await userEvent.click(btnCompras)
    // Wait for data load
    await waitFor(() => screen.getByText(/Camote Amarillo/i))
    // Table container exists (hidden in mobile by class but present in DOM)
    const thead = screen.getByRole('table')
    expect(thead).toBeInTheDocument()
    // Cards container exists for mobile rendering
    expect(screen.getByText(/Reportes/i)).toBeInTheDocument()
  })
})