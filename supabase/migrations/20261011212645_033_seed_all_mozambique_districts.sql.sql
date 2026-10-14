/*
# Seed all districts for all 11 provinces of Mozambique

1. Purpose
- Populate the districts table with all districts for each province.

2. No data is deleted — existing districts are preserved (ON CONFLICT DO NOTHING).
*/

INSERT INTO districts (name, province) VALUES
-- Niassa
('Lichinga', 'Niassa'), ('Mandimba', 'Niassa'), ('Marrupa', 'Niassa'), ('Majune', 'Niassa'),
('Magoé', 'Niassa'), ('Nipepe', 'Niassa'), ('Chimbunila', 'Niassa'), ('Lago', 'Niassa'),
('Sanga', 'Niassa'), ('Mecanhelas', 'Niassa'), ('Cuamba', 'Niassa'), ('Metarica', 'Niassa'),
('Maua', 'Niassa'), ('Ngauma', 'Niassa'),
-- Cabo Delgado
('Pemba', 'Cabo Delgado'), ('Metuge', 'Cabo Delgado'), ('Quissanga', 'Cabo Delgado'),
('Macomia', 'Cabo Delgado'), ('Mocímboa da Praia', 'Cabo Delgado'), ('Mueda', 'Cabo Delgado'),
('Muidumbe', 'Cabo Delgado'), ('Nangade', 'Cabo Delgado'),
('Palma', 'Cabo Delgado'), ('Ancuabe', 'Cabo Delgado'), ('Chiúre', 'Cabo Delgado'),
('Montepuez', 'Cabo Delgado'), ('Namuno', 'Cabo Delgado'), ('Balama', 'Cabo Delgado'),
-- Nampula
('Nampula', 'Nampula'), ('Meconta', 'Nampula'), ('Mecubúri', 'Nampula'), ('Moma', 'Nampula'),
('Mossuril', 'Nampula'), ('Murrupula', 'Nampula'), ('Mogincual', 'Nampula'), ('Mogovolas', 'Nampula'),
('Monapo', 'Nampula'), ('Nacala-a-Velha', 'Nampula'), ('Nacala-Porto', 'Nampula'),
('Ribaue', 'Nampula'), ('Lalaua', 'Nampula'), ('Eráti', 'Nampula'),
('Ilha de Moçambique', 'Nampula'), ('Larde', 'Nampula'), ('Liúpo', 'Nampula'), ('Malema', 'Nampula'),
('Memba', 'Nampula'),
-- Zambézia (existing: Alto Molócuè, Namarroi — add the rest)
('Gurúè', 'Zambézia'), ('Mocuba', 'Zambézia'), ('Pebane', 'Zambézia'), ('Molumbo', 'Zambézia'),
('Milevane', 'Zambézia'), ('Ile', 'Zambézia'), ('Magige', 'Zambézia'), ('Mulevala', 'Zambézia'),
('Naburi', 'Zambézia'), ('Quelimane', 'Zambézia'), ('Gile', 'Zambézia'),
('Mopeia', 'Zambézia'), ('Morrumbala', 'Zambézia'), ('Chinde', 'Zambézia'), ('Inhassunge', 'Zambézia'),
('Nicoadala', 'Zambézia'), ('Lugela', 'Zambézia'), ('Milange', 'Zambézia'),
-- Tete
('Tete', 'Tete'), ('Moatize', 'Tete'), ('Angónia', 'Tete'), ('Macanga', 'Tete'),
('Tsangano', 'Tete'), ('Dóà', 'Tete'), ('Marávia', 'Tete'), ('Changara', 'Tete'),
('Cahora-Bassa', 'Tete'), ('Chifunde', 'Tete'), ('Magoé', 'Tete'),
('Marromeu', 'Tete'), ('Mutarara', 'Tete'), ('Zumbo', 'Tete'), ('Chiúta', 'Tete'),
('Nhamayábué', 'Tete'),
-- Manica
('Chimoio', 'Manica'), ('Gondola', 'Manica'), ('Guro', 'Manica'), ('Bárue', 'Manica'),
('Macate', 'Manica'), ('Sussundenga', 'Manica'), ('Mossurize', 'Manica'), ('Macossa', 'Manica'),
('Tambara', 'Manica'), ('Vanduzi', 'Manica'), ('Manica', 'Manica'),
-- Sofala
('Beira', 'Sofala'), ('Dondo', 'Sofala'), ('Nhamatanda', 'Sofala'), ('Gorongosa', 'Sofala'),
('Marromeu', 'Sofala'), ('Cheringoma', 'Sofala'), ('Mwanza', 'Sofala'), ('Búzi', 'Sofala'),
('Caia', 'Sofala'), ('Machanga', 'Sofala'), ('Maringue', 'Sofala'), ('Chibabava', 'Sofala'),
-- Inhambane
('Inhambane', 'Inhambane'), ('Maxixe', 'Inhambane'), ('Jangamo', 'Inhambane'), ('Homoíne', 'Inhambane'),
('Panda', 'Inhambane'), ('Vilankulo', 'Inhambane'), ('Inharrime', 'Inhambane'), ('Massinga', 'Inhambane'),
('Morrumbene', 'Inhambane'), ('Zavala', 'Inhambane'), ('Inhassoro', 'Inhambane'), ('Govuro', 'Inhambane'),
('Mabote', 'Inhambane'), ('Funhalouro', 'Inhambane'),
-- Gaza
('Xai-Xai', 'Gaza'), ('Chibuto', 'Gaza'), ('Chókwè', 'Gaza'), ('Macia', 'Gaza'),
('Bilene', 'Gaza'), ('Manjacaze', 'Gaza'), ('Chongoene', 'Gaza'),
('Limpopo', 'Gaza'), ('Massingir', 'Gaza'), ('Chicualacuala', 'Gaza'), ('Mabalane', 'Gaza'),
('Massangena', 'Gaza'), ('Guijá', 'Gaza'), ('Mandlakazi', 'Gaza'), ('Mapai', 'Gaza'),
-- Maputo Província
('Matola', 'Maputo Província'), ('Boane', 'Maputo Província'), ('Magude', 'Maputo Província'),
('Moamba', 'Maputo Província'), ('Manhiça', 'Maputo Província'), ('Marracuene', 'Maputo Província'),
('Matutuine', 'Maputo Província'), ('Namaacha', 'Maputo Província'),
-- Maputo Cidade
('KaMpfumu', 'Maputo Cidade'), ('Nkalambe', 'Maputo Cidade'), ('KaMavota', 'Maputo Cidade'),
('KaMubukwana', 'Maputo Cidade'), ('Tembe', 'Maputo Cidade'), ('Inhaca', 'Maputo Cidade'),
('Catembe', 'Maputo Cidade'), ('KaMabutu', 'Maputo Cidade')
ON CONFLICT DO NOTHING;
