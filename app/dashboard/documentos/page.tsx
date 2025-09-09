'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';

const Modal = dynamic(() => import('../../../src/components/ui/Modal'), { ssr: false });

interface Document {
  id: string;
  name: string;
  type: 'invoice' | 'receipt' | 'contract' | 'report' | 'other';
  description: string;
  fileSize: string;
  uploadDate: string;
  uploadedBy: string;
  status: 'active' | 'archived' | 'deleted';
  tags: string[];
  relatedEntity?: string;
  relatedEntityType?: 'client' | 'supplier' | 'product';
}

export default function DocumentosPage() {
  const [documents, setDocuments] = useState<Document[]>([
    {
      id: '1',
      name: 'Factura_001_TodoFru.pdf',
      type: 'invoice',
      description: 'Factura de venta a cliente mayorista',
      fileSize: '245 KB',
      uploadDate: '2024-01-15',
      uploadedBy: 'Admin',
      status: 'active',
      tags: ['factura', 'venta', 'mayorista'],
      relatedEntity: 'Distribuidora Central',
      relatedEntityType: 'client'
    },
    {
      id: '2',
      name: 'Contrato_Proveedor_FreshFruit.pdf',
      type: 'contract',
      description: 'Contrato de suministro con FreshFruit Co.',
      fileSize: '1.2 MB',
      uploadDate: '2024-01-12',
      uploadedBy: 'Gerencia',
      status: 'active',
      tags: ['contrato', 'proveedor', 'suministro'],
      relatedEntity: 'FreshFruit Co.',
      relatedEntityType: 'supplier'
    },
    {
      id: '3',
      name: 'Reporte_Inventario_Enero.xlsx',
      type: 'report',
      description: 'Reporte mensual de inventario',
      fileSize: '890 KB',
      uploadDate: '2024-01-10',
      uploadedBy: 'Inventarios',
      status: 'active',
      tags: ['reporte', 'inventario', 'mensual']
    },
    {
      id: '4',
      name: 'Recibo_Compra_Manzanas.pdf',
      type: 'receipt',
      description: 'Recibo de compra de manzanas rojas',
      fileSize: '156 KB',
      uploadDate: '2024-01-08',
      uploadedBy: 'Compras',
      status: 'archived',
      tags: ['recibo', 'compra', 'manzanas']
    }
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState<Document | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'invoice' | 'receipt' | 'contract' | 'report' | 'other'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'archived' | 'deleted'>('all');

  const [formData, setFormData] = useState({
    name: '',
    type: 'invoice' as 'invoice' | 'receipt' | 'contract' | 'report' | 'other',
    description: '',
    tags: '',
    relatedEntity: '',
    relatedEntityType: 'client' as 'client' | 'supplier' | 'product',
    status: 'active' as 'active' | 'archived' | 'deleted'
  });

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = typeFilter === 'all' || doc.type === typeFilter;
    const matchesStatus = statusFilter === 'all' || doc.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  const getTypeLabel = (type: string) => {
    const labels = {
      invoice: 'Factura',
      receipt: 'Recibo',
      contract: 'Contrato',
      report: 'Reporte',
      other: 'Otro'
    };
    return labels[type as keyof typeof labels] || type;
  };

  const getTypeColor = (type: string) => {
    const colors = {
      invoice: 'bg-blue-100 text-blue-800',
      receipt: 'bg-green-100 text-green-800',
      contract: 'bg-purple-100 text-purple-800',
      report: 'bg-yellow-100 text-yellow-800',
      other: 'bg-gray-100 text-gray-800'
    };
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getStatusColor = (status: string) => {
    const colors = {
      active: 'bg-green-100 text-green-800',
      archived: 'bg-yellow-100 text-yellow-800',
      deleted: 'bg-red-100 text-red-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      active: 'Activo',
      archived: 'Archivado',
      deleted: 'Eliminado'
    };
    return labels[status as keyof typeof labels] || status;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingDocument) {
      setDocuments(prev => prev.map(doc => 
        doc.id === editingDocument.id 
          ? { 
              ...doc, 
              ...formData,
              tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag)
            }
          : doc
      ));
    } else {
      const newDocument: Document = {
        id: Date.now().toString(),
        ...formData,
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
        fileSize: '0 KB',
        uploadDate: new Date().toISOString().split('T')[0],
        uploadedBy: 'Usuario Actual'
      };
      setDocuments(prev => [...prev, newDocument]);
    }
    
    setIsModalOpen(false);
    setEditingDocument(null);
    setFormData({ 
      name: '', 
      type: 'invoice', 
      description: '', 
      tags: '', 
      relatedEntity: '', 
      relatedEntityType: 'client', 
      status: 'active' 
    });
  };

  const handleEdit = (doc: Document) => {
    setEditingDocument(doc);
    setFormData({
      name: doc.name,
      type: doc.type,
      description: doc.description,
      tags: doc.tags.join(', '),
      relatedEntity: doc.relatedEntity || '',
      relatedEntityType: doc.relatedEntityType || 'client',
      status: doc.status
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('¿Estás seguro de que quieres eliminar este documento?')) {
      setDocuments(prev => prev.filter(doc => doc.id !== id));
    }
  };

  const handleArchive = (id: string) => {
    setDocuments(prev => prev.map(doc => 
      doc.id === id ? { ...doc, status: 'archived' as const } : doc
    ));
  };

  const openModal = () => {
    setEditingDocument(null);
    setFormData({ 
      name: '', 
      type: 'invoice', 
      description: '', 
      tags: '', 
      relatedEntity: '', 
      relatedEntityType: 'client', 
      status: 'active' 
    });
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full p-6">
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Documentos</h1>
              <p className="text-gray-600 mt-1">{filteredDocuments.length} documentos encontrados</p>
            </div>
            <button
              onClick={openModal}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Subir Documento
            </button>
          </div>

          <div className="flex flex-col lg:flex-row gap-4 mb-6">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Buscar documentos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <div>
                <label htmlFor="type-filter" className="sr-only">Filtrar por tipo de documento</label>
                <select
                  id="type-filter"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as any)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  aria-label="Filtrar por tipo de documento"
                >
                  <option value="all">Todos los tipos</option>
                  <option value="invoice">Facturas</option>
                  <option value="receipt">Recibos</option>
                  <option value="contract">Contratos</option>
                  <option value="report">Reportes</option>
                  <option value="other">Otros</option>
                </select>
              </div>
              <div>
                <label htmlFor="status-filter" className="sr-only">Filtrar por estado de documento</label>
                <select
                  id="status-filter"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  aria-label="Filtrar por estado de documento"
                >
                  <option value="all">Todos los estados</option>
                  <option value="active">Activos</option>
                  <option value="archived">Archivados</option>
                  <option value="deleted">Eliminados</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mx-auto">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                    Documento
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                    Tipo
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                    Relacionado
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                    Etiquetas
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                    Fecha
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                    Estado
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredDocuments.map((doc) => (
                  <tr key={doc.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 border-r border-gray-200">
                      <div className="font-medium text-gray-900">{doc.name}</div>
                      <div className="text-sm text-gray-500">{doc.description}</div>
                      <div className="text-xs text-gray-400">{doc.fileSize} • {doc.uploadedBy}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap border-r border-gray-200">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(doc.type)}`}>
                        {getTypeLabel(doc.type)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap border-r border-gray-200">
                      {doc.relatedEntity ? (
                        <div className="text-sm text-gray-900">
                          <div>{doc.relatedEntity}</div>
                          <div className="text-xs text-gray-500 capitalize">{doc.relatedEntityType}</div>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 border-r border-gray-200">
                      <div className="flex flex-wrap gap-1">
                        {doc.tags.slice(0, 3).map((tag, index) => (
                          <span key={index} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                            {tag}
                          </span>
                        ))}
                        {doc.tags.length > 3 && (
                          <span className="text-xs text-gray-500">+{doc.tags.length - 3}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap border-r border-gray-200">
                      <div className="text-sm text-gray-900">{doc.uploadDate}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap border-r border-gray-200">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(doc.status)}`}>
                        {getStatusLabel(doc.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex space-x-2">
                        <button className="text-blue-600 hover:text-blue-800 font-medium">
                          Ver
                        </button>
                        <button
                          onClick={() => handleEdit(doc)}
                          className="text-green-600 hover:text-green-800 font-medium"
                        >
                          Editar
                        </button>
                        {doc.status === 'active' && (
                          <button
                            onClick={() => handleArchive(doc.id)}
                            className="text-yellow-600 hover:text-yellow-800 font-medium"
                          >
                            Archivar
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(doc.id)}
                          className="text-red-600 hover:text-red-800 font-medium"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {isModalOpen && (
          <Modal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            ariaLabel={editingDocument ? 'Editar documento' : 'Subir nuevo documento'}
          >
            <div className="modal-header">
              <h2 className="text-xl font-bold text-gray-900 mb-6">
                {editingDocument ? 'Editar Documento' : 'Subir Nuevo Documento'}
              </h2>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label htmlFor="document-name" className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre del Documento
                  </label>
                  <input
                    id="document-name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Factura_001_TodoFru.pdf"
                    required
                    aria-describedby="document-name-help"
                  />
                  <span id="document-name-help" className="text-xs text-gray-500">
                    Nombre descriptivo del archivo del documento
                  </span>
                </div>
                
                <div>
                  <label htmlFor="document-type" className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo
                  </label>
                  <select
                    id="document-type"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    aria-describedby="document-type-help"
                  >
                    <option value="invoice">Factura</option>
                    <option value="receipt">Recibo</option>
                    <option value="contract">Contrato</option>
                    <option value="report">Reporte</option>
                    <option value="other">Otro</option>
                  </select>
                  <span id="document-type-help" className="text-xs text-gray-500">
                    Categoría del documento
                  </span>
                </div>
                
                <div>
                  <label htmlFor="document-status" className="block text-sm font-medium text-gray-700 mb-2">
                    Estado
                  </label>
                  <select
                    id="document-status"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    aria-describedby="document-status-help"
                  >
                    <option value="active">Activo</option>
                    <option value="archived">Archivado</option>
                  </select>
                  <span id="document-status-help" className="text-xs text-gray-500">
                    Estado actual del documento
                  </span>
                </div>
                
                <div className="md:col-span-2">
                  <label htmlFor="document-description" className="block text-sm font-medium text-gray-700 mb-2">
                    Descripción
                  </label>
                  <textarea
                    id="document-description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Descripción del contenido del documento"
                    required
                    aria-describedby="document-description-help"
                  />
                  <span id="document-description-help" className="text-xs text-gray-500">
                    Descripción detallada del contenido y propósito del documento
                  </span>
                </div>
                
                <div>
                  <label htmlFor="document-entity" className="block text-sm font-medium text-gray-700 mb-2">
                    Entidad Relacionada (opcional)
                  </label>
                  <input
                    id="document-entity"
                    type="text"
                    value={formData.relatedEntity}
                    onChange={(e) => setFormData({ ...formData, relatedEntity: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Nombre del cliente, proveedor o producto"
                    aria-describedby="document-entity-help"
                  />
                  <span id="document-entity-help" className="text-xs text-gray-500">
                    Cliente, proveedor o producto relacionado con el documento
                  </span>
                </div>
                
                <div>
                  <label htmlFor="document-entity-type" className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de Entidad
                  </label>
                  <select
                    id="document-entity-type"
                    value={formData.relatedEntityType}
                    onChange={(e) => setFormData({ ...formData, relatedEntityType: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    aria-describedby="document-entity-type-help"
                  >
                    <option value="client">Cliente</option>
                    <option value="supplier">Proveedor</option>
                    <option value="product">Producto</option>
                  </select>
                  <span id="document-entity-type-help" className="text-xs text-gray-500">
                    Tipo de entidad relacionada con el documento
                  </span>
                </div>
                
                <div className="md:col-span-2">
                  <label htmlFor="document-tags" className="block text-sm font-medium text-gray-700 mb-2">
                    Etiquetas (separadas por comas)
                  </label>
                  <input
                    id="document-tags"
                    type="text"
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="factura, venta, mayorista"
                    aria-describedby="document-tags-help"
                  />
                  <span id="document-tags-help" className="text-xs text-gray-500">
                    Etiquetas para facilitar la búsqueda del documento
                  </span>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  {editingDocument ? 'Actualizar' : 'Subir'}
                </button>
              </div>
            </form>
          </Modal>
        )}
      </div>
    </div>
  );
}