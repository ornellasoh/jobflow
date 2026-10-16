import test from 'node:test';
import assert from 'node:assert/strict';
import {columnOf,isArchived,weekCount,transition,addDays} from '../web/model.mjs';

test('les anciens brouillons restent dans À postuler et les refus dans Archives',()=>{
  assert.equal(columnOf({status:'À préparer'}),'todo');
  assert.equal(columnOf({status:'Documents prêts'}),'todo');
  assert.equal(columnOf({status:'Entretien'}),'interview');
  assert.equal(isArchived({status:'Refusée'}),true);
  assert.equal(isArchived({status:'Envoyée'}),false);
});
test('l’envoi fixe une relance J+10 sans écraser les dates d’un envoi existant',()=>{
  const original={status:'Documents prêts',company:'Test',role:'PMO'};
  const sent=transition(original,'Envoyée','2026-10-26');
  assert.equal(sent.applied_date,'2026-10-26');
  assert.equal(sent.follow_up_date,'2026-11-05');
  assert.equal(original.status,'Documents prêts');
  assert.equal(transition(sent,'Entretien','2026-11-01').applied_date,'2026-10-26');
  assert.equal(transition(sent,'Envoyée','2026-11-01').history.length,1);
});
test('l’objectif hebdomadaire exclut les brouillons, la semaine précédente et les dates futures',()=>{
  const records=[{}, {applied_date:'2026-10-11'}, {applied_date:'2026-10-12'}, {applied_date:'2026-10-16'}, {applied_date:'2026-10-18'}];
  assert.equal(weekCount(records,'2026-10-16'),2);
  assert.equal(weekCount(records,'2026-10-18'),3);
  assert.equal(addDays('2026-12-25',10),'2027-01-04');
});
