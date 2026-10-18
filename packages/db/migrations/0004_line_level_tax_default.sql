-- New organisations work tax out per line unless their country's preset says otherwise (decision 0007).
alter table organisation alter column tax_level set default 'line';
