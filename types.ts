
export enum UserRole {
  ADMIN = 'Administrador',
  OPERATOR = 'Operador'
}

export interface User {
  id: string;
  name: string;
  username: string;
  /** @deprecated Use passwordHash instead */
  password?: string;
  /** SHA-256 hash da senha */
  passwordHash?: string;
  role: UserRole;
  status: 'Ativo' | 'Inativo';
  /** Timestamp do login (para expiração da sessão) */
  _loginAt?: number;
  _expiresAt?: number;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  module: string;
  timestamp: string;
  details: string;
}

export enum VehicleStatus {
  ACTIVE = 'ativo',
  MAINTENANCE = 'manutencao',
  INACTIVE = 'inativo'
}

export interface Vehicle {
  id: string;
  placa: string;
  renavam: string;
  chassi: string;
  marca: string;
  modelo: string;
  ano_fabricacao: number;
  ano_modelo: number;
  tipo_veiculo: string;
  cor: string;
  combustivel: string;
  quilometragem: number;
  data_ultima_revisao: string;
  status: VehicleStatus;
  observacoes: string;
  crlv_url?: string;
  seguro_url?: string;
}

export interface ReceiptItem {
  id: string;
  description: string;
  quantity: number;
  unitValue: number;
}

export interface Receipt {
  id: string;
  date: string;
  value: number;
  description: string;
  vehicleId: string;
  documentNumber?: string;
  mileage?: number;
  // Campos específicos para postos
  fuelType?: string;
  liters?: number;
  pricePerLiter?: number;
  // Campos específicos para oficinas/peças
  warrantyUntil?: string;
  items?: ReceiptItem[];
  professional?: string; // Mecânico ou Técnico responsável
  // Controle de Troca de Óleo
  isOilChange?: boolean;
  nextOilChangeKm?: number;
}

export interface ResourceBase {
  id: string;
  nome: string;
  cnpj: string;
  endereco: string;
  telefone: string;
  observacoes: string;
  receipts: Receipt[];
}

export interface FuelStation extends ResourceBase {
  combustiveis_disponiveis: string;
}

export interface Workshop extends ResourceBase {
  especialidades: string;
}

export interface AutoPartStore extends ResourceBase {
  tipos_pecas: string;
}

export enum InspectionItemStatus {
  OK = 'OK',
  WARNING = 'Atenção',
  PROBLEM = 'Problema'
}

export interface InspectionItem {
  id: string;
  name: string;
  status: InspectionItemStatus;
  observation: string;
}

export enum InspectionResult {
  APPROVED = 'Aprovado',
  REJECTED = 'Reprovado'
}

export interface Inspection {
  id: string;
  veiculo_id: string;
  usuario_responsavel_id: string;
  data: string;
  status_final: InspectionResult;
  observacoes_gerais: string;
  items: InspectionItem[];
  photo_urls: string[];
}
