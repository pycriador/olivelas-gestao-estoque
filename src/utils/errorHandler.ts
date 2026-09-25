/**
 * Global Error Handler & Formatter
 */

export interface AppError {
  message: string
  code?: string
  status?: number
  details?: unknown
}

export function parseApiError(error: unknown): string {
  if (!error) return 'Ocorreu um erro inesperado.'

  if (typeof error === 'string') return error

  if (typeof error === 'object' && error !== null) {
    const err = error as Record<string, unknown>
    
    // Supabase error format
    if (typeof err.message === 'string') {
      const msg = err.message.toLowerCase()
      if (msg.includes('row-level security') || msg.includes('permission denied')) {
        return 'Acesso não autorizado ou violação de política de loja (RLS).'
      }
      if (msg.includes('duplicate key') || msg.includes('unique constraint')) {
        return 'Registro duplicado. Já existe um item com este identificador único nesta loja.'
      }
      if (msg.includes('foreign key constraint')) {
        return 'Esta operação não pode ser concluída porque o registro possui dependências vinculadas.'
      }
      if (msg.includes('invalid login credentials')) {
        return 'Credenciais inválidas. Verifique seu e-mail e senha.'
      }
      if (msg.includes('email not confirmed')) {
        return 'Seu e-mail ainda não foi confirmado. Verifique o link de ativação enviado para sua caixa de entrada ou confirme o usuário no painel do Supabase (Authentication -> Users).'
      }
      if (msg.includes('user already registered')) {
        return 'Este endereço de e-mail já está cadastrado no sistema.'
      }
      return err.message
    }

    if (typeof err.error_description === 'string') {
      return err.error_description
    }
  }

  return 'Ocorreu um erro ao processar sua solicitação.'
}
