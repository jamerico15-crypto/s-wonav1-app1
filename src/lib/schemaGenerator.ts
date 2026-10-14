import type { SchemaProposal, SchemaTable, SchemaColumn } from '@/types';

const COLUMN_TYPE_MAP: Record<string, string[]> = {
  text: ['name', 'title', 'description', 'notes', 'comment', 'label', 'address', 'location', 'reason', 'feedback', 'observation'],
  integer: ['count', 'number', 'quantity', 'age', 'total', 'amount', 'score', 'level', 'grade', 'cases', 'participants', 'beneficiaries'],
  numeric: ['budget', 'cost', 'price', 'rate', 'percentage', 'ratio', 'value', 'spent', 'expenditure'],
  boolean: ['active', 'completed', 'verified', 'approved', 'status', 'confirmed', 'enabled', 'present', 'has'],
  date: ['date', 'start', 'end', 'deadline', 'when', 'recorded', 'reported', 'created', 'updated'],
  uuid: ['id', 'project_id', 'district_id', 'indicator_id', 'activity_id', 'beneficiary_id', 'user_id', 'group_id', 'school_id', 'patient_id'],
};

const FOREIGN_KEY_PATTERNS: Record<string, { table: string; column: string }> = {
  project_id: { table: 'projects', column: 'id' },
  district_id: { table: 'districts', column: 'id' },
  indicator_id: { table: 'indicators', column: 'id' },
  activity_id: { table: 'activities', column: 'id' },
  beneficiary_id: { table: 'beneficiaries', column: 'id' },
  user_id: { table: 'profiles', column: 'id' },
};

const ENTITY_KEYWORDS: Record<string, string[]> = {
  screening: ['screening', 'test', 'check', 'examine'],
  survey: ['survey', 'assessment', 'evaluation', 'questionnaire'],
  training: ['training', 'workshop', 'session', 'capacity'],
  case: ['case', 'patient', 'diagnosis', 'treatment'],
  group: ['group', 'community', 'opal', 'savings', 'association'],
  report: ['report', 'record', 'log', 'entry'],
  school: ['school', 'student', 'education', 'enrollment'],
  health: ['health', 'clinic', 'facility', 'worker', 'hospital'],
};

function inferType(fieldName: string): string {
  const lower = fieldName.toLowerCase().trim();
  for (const [type, keywords] of Object.entries(COLUMN_TYPE_MAP)) {
    if (keywords.some(kw => lower.includes(kw))) {
      return type;
    }
  }
  return 'text';
}

function isForeignKey(fieldName: string): boolean {
  return fieldName.toLowerCase().endsWith('_id') && fieldName.toLowerCase() !== 'id';
}

function detectEntities(prompt: string): string[] {
  const lower = prompt.toLowerCase();
  const entities: string[] = [];
  for (const [entity, keywords] of Object.entries(ENTITY_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) {
      entities.push(entity);
    }
  }
  return entities.length > 0 ? entities : ['tracker'];
}

function extractFieldNames(prompt: string): string[] {
  const fields: string[] = [];
  const lower = prompt.toLowerCase();

  const fieldKeywords = [
    'name', 'date', 'age', 'gender', 'district', 'location', 'result', 'score',
    'status', 'count', 'total', 'cases', 'diagnosis', 'treatment', 'grade',
    'disability', 'school', 'student', 'participant', 'volunteer', 'worker',
    'budget', 'cost', 'notes', 'description', 'photo', 'signature',
    'confirmed', 'verified', 'approved', 'completed', 'approved', 'type',
    'baseline', 'target', 'current', 'progress', 'indicators', 'outcome',
    'male', 'female', 'deformity', 'leprosy', 'ntd', 'stigma', 'malnutrition',
  ];

  fieldKeywords.forEach(kw => {
    if (lower.includes(kw) && !fields.includes(kw)) {
      fields.push(kw);
    }
  });

  if (lower.includes('linked') || lower.includes('baseline') || lower.includes('indicator')) {
    if (!fields.includes('indicator_id')) fields.push('indicator_id');
  }
  if (lower.includes('district') || lower.includes('strata') || lower.includes('area')) {
    if (!fields.includes('district_id')) fields.push('district_id');
  }
  if (lower.includes('project') && !fields.includes('project_id')) {
    fields.push('project_id');
  }

  return fields;
}

function buildTable(tableName: string, description: string, fields: string[], addProjectLink: boolean): SchemaTable {
  const columns: SchemaColumn[] = [
    { name: 'id', type: 'uuid', is_primary: true, is_foreign: false, nullable: false, default: 'gen_random_uuid()' },
  ];

  const seen = new Set<string>();

  for (const field of fields) {
    if (field === 'id') continue;
    const fieldName = field === 'cases' ? 'case_count' : field.replace(/\s+/g, '_');

    if (seen.has(fieldName)) continue;
    seen.add(fieldName);

    const type = inferType(fieldName);
    const isFk = isForeignKey(fieldName);
    const fkInfo = isFk ? FOREIGN_KEY_PATTERNS[fieldName] : undefined;

    columns.push({
      name: fieldName,
      type,
      is_primary: false,
      is_foreign: isFk,
      foreign_table: fkInfo?.table,
      foreign_column: fkInfo?.column,
      nullable: !isFk,
    });
  }

  if (addProjectLink && !seen.has('project_id')) {
    columns.push({
      name: 'project_id', type: 'uuid', is_primary: false, is_foreign: true,
      foreign_table: 'projects', foreign_column: 'id', nullable: true,
    });
  }

  columns.push({
    name: 'created_at', type: 'timestamptz', is_primary: false, is_foreign: false, nullable: false, default: 'now()',
  });

  return { name: tableName, description, columns };
}

export function generateSchemaProposal(prompt: string): SchemaProposal {
  const entities = detectEntities(prompt);
  const fields = extractFieldNames(prompt);
  const hasLinking = prompt.toLowerCase().includes('linked') || prompt.toLowerCase().includes('baseline') || prompt.toLowerCase().includes('indicator');
  const hasProjectRef = prompt.toLowerCase().includes('project');

  const tables: SchemaTable[] = [];
  const relationships: string[] = [];

  if (entities.length === 1) {
    const entity = entities[0];
    const tableName = `custom_${entity}_data`;
    tables.push(buildTable(tableName, `Custom tracking table for ${entity} data`, fields, hasProjectRef || hasLinking));
  } else {
    const mainEntity = entities[0];
    const mainTable = buildTable(
      `custom_${mainEntity}_data`,
      `Custom tracking table for ${mainEntity} data`,
      fields.filter(f => !isForeignKey(f)),
      hasProjectRef
    );
    tables.push(mainTable);

    for (let i = 1; i < entities.length; i++) {
      const entity = entities[i];
      const linkedFields = fields.filter(f => isForeignKey(f));
      const subTable = buildTable(
        `custom_${entity}_data`,
        `Related ${entity} data table`,
        [...linkedFields, ...extractFieldNames(entity + ' name description date status')],
        true
      );

      const fkCol = subTable.columns.find(c => c.is_foreign && c.name === `${mainEntity}_id`);
      if (!fkCol) {
        subTable.columns.splice(1, 0, {
          name: `${mainEntity}_id`, type: 'uuid', is_primary: false, is_foreign: true,
          foreign_table: `custom_${mainEntity}_data`, foreign_column: 'id', nullable: false,
        });
      }

      tables.push(subTable);
      relationships.push(`${subTable.name}.${mainEntity}_id → ${mainTable.name}.id (foreign key)`);
    }
  }

  for (const table of tables) {
    for (const col of table.columns) {
      if (col.is_foreign && col.foreign_table) {
        relationships.push(`${table.name}.${col.name} → ${col.foreign_table}.${col.foreign_column}`);
      }
    }
  }

  return { tables, relationships: [...new Set(relationships)] };
}

export function proposalToSql(proposal: SchemaProposal): string {
  const lines: string[] = [];

  for (const table of proposal.tables) {
    lines.push(`CREATE TABLE IF NOT EXISTS ${table.name} (`);
    const colDefs: string[] = [];

    for (const col of table.columns) {
      let def = `  ${col.name} ${col.type}`;
      if (col.is_primary) def += ' PRIMARY KEY';
      if (col.default) def += ` DEFAULT ${col.default}`;
      if (!col.nullable && !col.is_primary) def += ' NOT NULL';
      if (col.is_foreign) def += ` REFERENCES ${col.foreign_table}(${col.foreign_column}) ON DELETE CASCADE`;
      colDefs.push(def);
    }

    lines.push(colDefs.join(',\n'));
    lines.push(');');
    lines.push('');
    lines.push(`ALTER TABLE ${table.name} ENABLE ROW LEVEL SECURITY;`);
    lines.push(`CREATE POLICY "${table.name}_select" ON ${table.name} FOR SELECT TO authenticated USING (true);`);
    lines.push(`CREATE POLICY "${table.name}_insert" ON ${table.name} FOR INSERT TO authenticated WITH CHECK (true);`);
    lines.push(`CREATE POLICY "${table.name}_update" ON ${table.name} FOR UPDATE TO authenticated USING (true) WITH CHECK (true);`);
    lines.push(`CREATE POLICY "${table.name}_delete" ON ${table.name} FOR DELETE TO authenticated USING (true);`);
    lines.push('');
  }

  return lines.join('\n');
}
