import {cvDocumentSchema, type CvDocument} from '../cv/schema';
import {supabase} from './supabaseClient';

export type CloudResumeSummary = {id: string; title: string; updatedAt: string};

export interface CloudResumeRepository {
  list(): Promise<CloudResumeSummary[]>;
  load(id: string): Promise<CvDocument>;
  save(document: CvDocument): Promise<CvDocument>;
  remove(id: string): Promise<void>;
}

function client() {
  if (!supabase) throw new Error('Cloud sync is not configured.');
  return supabase;
}

async function currentUserId(): Promise<string> {
  const {data, error} = await client().auth.getUser();
  if (error || !data.user) throw new Error('Sign in before using cloud sync.');
  return data.user.id;
}

export class SupabaseResumeRepository {
  async list(): Promise<CloudResumeSummary[]> {
    const userId = await currentUserId();
    const {data, error} = await client().from('resumes').select('id,title,updated_at').eq('user_id', userId).order('updated_at', {ascending: false});
    if (error) throw error;
    return (data ?? []).map(row => ({id: String(row.id), title: String(row.title), updatedAt: String(row.updated_at)}));
  }

  async load(id: string): Promise<CvDocument> {
    const userId = await currentUserId();
    const {data, error} = await client().from('resumes').select('content').eq('id', id).eq('user_id', userId).single();
    if (error) throw error;
    return cvDocumentSchema.parse(data.content);
  }

  async save(document: CvDocument): Promise<CvDocument> {
    const userId = await currentUserId();
    const cloudDocument = /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(document.id) ? document : {...document, id: crypto.randomUUID()};
    const cloudTitle = cloudDocument.title.trim() || cloudDocument.basics.fullName.trim() || 'Untitled CV';
    const {error} = await client().from('resumes').upsert({
      id: cloudDocument.id,
      user_id: userId,
      title: cloudTitle,
      template_id: cloudDocument.settings.templateId,
      schema_version: cloudDocument.schemaVersion,
      content: cloudDocument,
      updated_at: new Date().toISOString(),
    }, {onConflict: 'id'});
    if (error) throw error;
    return cloudDocument;
  }

  async remove(id: string): Promise<void> {
    const userId = await currentUserId();
    const {error} = await client().from('resumes').delete().eq('id', id).eq('user_id', userId);
    if (error) throw error;
  }
}

export const supabaseResumeRepository = new SupabaseResumeRepository();
