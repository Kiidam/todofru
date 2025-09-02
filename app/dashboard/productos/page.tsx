'use client';

import { useState, useEffect } from 'react';
// Using simple text icons instead of heroicons for now

interface Producto {
  id: string;
  nombre: string;
  sku: string;
  descripcion: string;
  precio: number;
  categoria: string;
  stock: number;
  fechaCreacion: string;
  activo: boolean;
}

export default function ProductosPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [filteredProductos, setFilteredProductos] = useState<Producto[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Producto | null>(null);
  const [formData, setFormData] = useState({
    nombre: '',
    sku: '',
    descripcion: '',
    precio: '',
    categoria: '',
    stock: ''
  });

  // Datos de ejemplo
  useEffect(() => {
    const productosEjemplo: Producto[] = [
      {
        id: '1',
        nombre: 'AGUAJE',
        sku: 'YPA65997',
        descripcion: 'AGUAJE',
        precio: 7.50,
        categoria: 'Frutas',
        stock: 150,
        fechaCreacion: '9/4/2025',
        activo: true
      },
      {
        id: '2',
        nombre: 'ACELGA',
        sku: 'RHA63454',
        descripcion: 'ACELGA',
        precio: 4.50,
        categoria: 'Verduras',
        stock: 80,
        fechaCreacion: '9/4/2025',
        activo: true
      },
      {
        id: '3',
        nombre: 'AGUAYMANTO',
        sku: 'YDT09205',
        descripcion: 'AGUAYMANTO',
        precio: 8.00,
        categoria: 'Frutas',
        stock: 120,
        fechaCreacion: '9/4/2025',
        activo: true
      },
      {
        id: '4',
        nombre: 'AJI AMARILLO',
        sku: 'RQF26446',
        descripcion: 'AJI AMARILLO',
        precio: 3.80,
        categoria: 'Condimentos',
        stock: 200,
        fechaCreacion: '9/4/2025',
        activo: true
      },
      {
        id: '5',
        nombre: 'AJI CHARAPITA',
        sku: 'HJC53072',
        descripcion: 'AJI CHARAPITA',
        precio: 1.00,
        categoria: 'Condimentos',
        stock: 300,
        fechaCreacion: '9/4/2025',
        activo: true
      },
      {
        id: '6',
        nombre: 'AJI DULCE',
        sku: 'HQP17333',
        descripcion: 'AJI DULCE',
        precio: 1.00,
        categoria: 'Condimentos',
        stock: 250,
        fechaCreacion: '9/4/2025',
        activo: true
      }
    ];
    setProductos(productosEjemplo);
    setFilteredProductos(productosEjemplo);
  }, []);

  // Filtrar productos
  useEffect(() => {
    let filtered = productos.filter(producto => 
      producto.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      producto.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      producto.descripcion.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    if (filterCategory && filterCategory !== '') {
      filtered = filtered.filter(producto => 
        producto.categoria.toLowerCase().includes(filterCategory.toLowerCase())
      );
    }
    
    setFilteredProductos(filtered);
  }, [searchTerm, filterCategory, productos]);

  const resetForm = () => {
    setFormData({
      nombre: '',
      sku: '',
      descripcion: '',
      precio: '',
      categoria: '',
      stock: ''
    });
    setEditingProduct(null);
  };

  const handleCreateProduct = () => {
    resetForm();
    setShowModal(true);
  };

  const handleEditProduct = (producto: Producto) => {
    setEditingProduct(producto);
    setFormData({
      nombre: producto.nombre,
      sku: producto.sku,
      descripcion: producto.descripcion,
      precio: producto.precio.toString(),
      categoria: producto.categoria,
      stock: producto.stock.toString()
    });
    setShowModal(true);
  };

  const handleDeleteProduct = (id: string) => {
    if (confirm('¿Estás seguro de que quieres eliminar este producto?')) {
      setProductos(productos.filter(p => p.id !== id));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingProduct) {
      // Editar producto existente
      setProductos(productos.map(p => 
        p.id === editingProduct.id 
          ? {
              ...p,
              nombre: formData.nombre,
              sku: formData.sku,
              descripcion: formData.descripcion,
              precio: parseFloat(formData.precio),
              categoria: formData.categoria,
              stock: parseInt(formData.stock)
            }
          : p
      ));
    } else {
      // Crear nuevo producto
      const newProduct: Producto = {
        id: Date.now().toString(),
        nombre: formData.nombre,
        sku: formData.sku,
        descripcion: formData.descripcion,
        precio: parseFloat(formData.precio),
        categoria: formData.categoria,
        stock: parseInt(formData.stock),
        fechaCreacion: new Date().toLocaleDateString('es-ES'),
        activo: true
      };
      setProductos([...productos, newProduct]);
    }
    
    setShowModal(false);
    resetForm();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="w-full min-h-screen bg-gray-50">
      <div className="w-full p-6">
        {/* Header */}
        <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Administrador de Productos</h1>
            <p className="text-gray-600 mt-1">{filteredProductos.length} producto(s) encontrado(s) en INVERSIONES GLOBAL FRUT S.A.C.</p>
          </div>
          <button
            onClick={handleCreateProduct}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <span className="text-xl">+</span>
            <span>Crear Producto</span>
          </button>
        </div>

        {/* Filtros */}
        <div className="flex space-x-4 mb-4">
          <button className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors">
            INVERS. GLOBAL FRUT (268)
          </button>
          <button className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors">
            INVERS. Y SOLIC. MAGER (225)
          </button>
          <button className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors">
            PROVA FRUT (15)
          </button>
          <button className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors">
            COMPANY GLOBAL FRUT (225)
          </button>
          <button className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors">
            TICSE HUAYTA VICTOR DANIEL (225)
          </button>
        </div>

        <div className="bg-gray-100 px-4 py-2 rounded-lg">
          <span className="text-gray-700 font-medium">FRUVE PREMIUM (48)</span>
        </div>

        {/* Búsqueda */}
        <div className="mt-4 bg-gray-50 p-4 rounded-lg">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">Buscar productos</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                  🔍
                </span>
                <input
                  type="text"
                  placeholder="Buscar por nombre, SKU o descripción..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                />
              </div>
            </div>
            <div className="sm:w-64">
              <label className="block text-sm font-medium text-gray-700 mb-2">Filtrar por categoría</label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                <option value="">Todas las categorías</option>
                <option value="Frutas">Frutas</option>
                <option value="Verduras">Verduras</option>
                <option value="Condimentos">Condimentos</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Tabla de productos */}
        <div className="bg-white shadow-lg rounded-lg border border-gray-200 overflow-hidden mx-auto">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-1/4 border-r border-gray-200">
                PRODUCTO
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-1/6 border-r border-gray-200">
                SKU
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-1/6 border-r border-gray-200">
                CATEGORÍA
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-1/8 border-r border-gray-200">
                PRECIO
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-1/8 border-r border-gray-200">
                STOCK
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-1/8 border-r border-gray-200">
                ESTADO
              </th>
              <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider w-1/6">
                ACCIONES
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredProductos.map((producto) => (
              <tr key={producto.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap border-r border-gray-200">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{producto.nombre}</div>
                    <div className="text-xs text-gray-500">{producto.descripcion}</div>
                    <div className="text-xs text-gray-400">{producto.fechaCreacion}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-gray-200">
                  <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">{producto.sku}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-gray-200">
                  <span className="inline-flex px-2 py-1 text-xs font-medium rounded-md bg-blue-100 text-blue-800">
                    {producto.categoria}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold border-r border-gray-200">
                  <span className="text-green-600">S/ {producto.precio.toFixed(2)}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-gray-200">
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-md ${
                    producto.stock > 10 ? 'bg-green-100 text-green-800' :
                    producto.stock > 0 ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {producto.stock} unidades
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap border-r border-gray-200">
                  <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                    producto.activo 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {producto.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex justify-center space-x-3">
                    <button
                      onClick={() => handleEditProduct(producto)}
                      className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-2 rounded-md transition-colors"
                      title="Editar producto"
                    >
                      <span className="text-base">✏️</span>
                    </button>
                    <button
                      onClick={() => handleDeleteProduct(producto.id)}
                      className="text-red-600 hover:text-red-800 hover:bg-red-50 p-2 rounded-md transition-colors"
                      title="Eliminar producto"
                    >
                      <span className="text-base">🗑️</span>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
            </table>
          </div>
        </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
          <div className="relative mx-auto p-6 border w-full max-w-md shadow-xl rounded-lg bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingProduct ? 'Editar Producto' : 'Crear Nuevo Producto'}
              </h3>
              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre del Producto
                  </label>
                  <input
                    type="text"
                    name="nombre"
                    value={formData.nombre}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    SKU
                  </label>
                  <input
                    type="text"
                    name="sku"
                    value={formData.sku}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descripción
                  </label>
                  <input
                    type="text"
                    name="descripcion"
                    value={formData.descripcion}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Precio (S/)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    name="precio"
                    value={formData.precio}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Categoría
                  </label>
                  <input
                    type="text"
                    name="categoria"
                    value={formData.categoria}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Stock
                  </label>
                  <input
                    type="number"
                    name="stock"
                    value={formData.stock}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                  />
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors"
                  >
                    {editingProduct ? 'Actualizar' : 'Crear'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}