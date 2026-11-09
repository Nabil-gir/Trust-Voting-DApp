"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity as ActivityIcon, ArrowRight, ArrowUpRight, BarChart3,
  Check, CheckCheck, CheckCircle2, ChevronRight, CircleAlert, CircleHelp, CircleUserRound,
  Copy, ExternalLink, FileText, Fingerprint, Flag, Layers3,
  LayoutDashboard, LoaderCircle, LockKeyhole, RefreshCw, Search, ShieldCheck,
  Sparkles, Users, Vote, Wallet, X,
} from "lucide-react";
import { isAddress, zeroAddress } from "viem";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { WalletButton } from "@/components/wallet-button";
import { useVoting } from "@/hooks/use-voting";
import { PHASES, TRANSITIONS, shortAddress, type Proposal, type VotingAction } from "@/lib/voting-types";

type Section = "overview" | "proposals" | "voters" | "activity";
type Confirmation = { action: VotingAction; args?: readonly unknown[]; title: string; description: string; proposal?: Proposal };
const navigation = [
  { value: "overview", label: "Vue d’ensemble", icon: LayoutDashboard },
  { value: "proposals", label: "Propositions", icon: Layers3 },
  { value: "voters", label: "Électeurs", icon: Users },
  { value: "activity", label: "Activité", icon: ActivityIcon },
] as const;
const activityIcons = { voter: Users, proposal: FileText, vote: Vote, workflow: Flag };
const percentage = (value: bigint, total: bigint) => total === 0n ? 0 : Number((value * 10000n) / total) / 100;

function EmptyState({ icon: Icon, title, children }: { icon: typeof Vote; title: string; children: React.ReactNode }) {
  return <div className="empty-state"><span className="empty-icon"><Icon size={25} strokeWidth={1.5} /></span><h3>{title}</h3><p>{children}</p></div>;
}

export function VotingDashboard() {
  const voting = useVoting();
  const { snapshot, transaction } = voting;
  const [section, setSection] = useState<Section>("overview");
  const [voterAddress, setVoterAddress] = useState("");
  const [proposalText, setProposalText] = useState("");
  const [voterSearch, setVoterSearch] = useState("");
  const [proposalSearch, setProposalSearch] = useState("");
  const [selectedProposal, setSelectedProposal] = useState<bigint | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const status = snapshot?.status ?? 0;
  const phase = PHASES[status] ?? PHASES[0];
  const totalVotes = snapshot?.proposals.reduce((sum, proposal) => sum + proposal.voteCount, 0n) ?? 0n;
  const voterCount = snapshot?.voters.length ?? 0;
  const participation = percentage(totalVotes, BigInt(voterCount));
  const canWrite = !!snapshot && voting.isConnected && !voting.isWrongNetwork && !voting.isPending && !voting.error && !voting.isFetching;
  const ownVoter = snapshot?.voters.find(voter => voter.address.toLowerCase() === voting.address?.toLowerCase());
  const myVote = ownVoter?.hasVoted ? snapshot?.proposals.find(proposal => proposal.id === ownVoter.votedProposalId) : undefined;
  const selected = snapshot?.proposals.find(proposal => proposal.id === selectedProposal);
  const filteredVoters = useMemo(() => snapshot?.voters.filter(voter => voter.address.toLowerCase().includes(voterSearch.trim().toLowerCase())) ?? [], [snapshot, voterSearch]);
  const filteredProposals = useMemo(() => snapshot?.proposals.filter(proposal => `${proposal.id} ${proposal.description}`.toLowerCase().includes(proposalSearch.trim().toLowerCase())) ?? [], [snapshot, proposalSearch]);
  const transactionUrl = transaction.hash && voting.explorerUrl ? `${voting.explorerUrl}/tx/${transaction.hash}` : undefined;

  async function copy(value: string) {
    try { await navigator.clipboard.writeText(value); setCopied(value); window.setTimeout(() => setCopied(null), 2000); }
    catch { setFormError("La copie n’est pas disponible dans ce navigateur. Vous pouvez sélectionner l’adresse directement."); }
  }

  async function registerVoter(address = voterAddress.trim()) {
    setFormError(null);
    if (!isAddress(address) || address.toLowerCase() === zeroAddress) { setFormError("Saisissez une adresse Ethereum valide, différente de l’adresse nulle."); return; }
    if (snapshot?.voters.some(voter => voter.address.toLowerCase() === address.toLowerCase())) { setFormError("Cette adresse est déjà inscrite sur la liste électorale."); return; }
    if (await voting.execute("addVoter", [address])) setVoterAddress("");
  }

  async function submitProposal() {
    setFormError(null);
    const description = proposalText.trim();
    if (!description) { setFormError("Décrivez votre proposition avant de l’envoyer."); return; }
    if (await voting.execute("addProposal", [description])) setProposalText("");
  }

  async function confirmAction() {
    if (!confirmation || !canWrite) return;
    const success = await voting.execute(confirmation.action, confirmation.args);
    if (success) { setConfirmation(null); setSelectedProposal(null); }
  }

  function requestVote(proposal: Proposal) {
    setConfirmation({ action: "setVote", args: [proposal.id], title: "Confirmer votre vote", description: "Vous disposez d’une seule voix. Une fois confirmé sur la blockchain, votre vote ne pourra plus être modifié.", proposal });
  }

  const ownerControls = snapshot && voting.isOwner && status < 5 && (
    <Card className="surface-card owner-card">
      <div className="card-heading"><span className="icon-square orange"><ShieldCheck size={19} /></span><div><h3>Administration du scrutin</h3><p>Vous pilotez les étapes de cette session.</p></div><Badge className="role-badge">Administrateur</Badge></div>
      {status === 0 && <form className="voter-form" onSubmit={event => { event.preventDefault(); void registerVoter(); }}>
        <label htmlFor="voter-address">Inscrire un électeur</label>
        <div className="inline-input"><Input id="voter-address" placeholder="Adresse du wallet · 0x…" value={voterAddress} onChange={event => { setVoterAddress(event.target.value); setFormError(null); }} autoComplete="off" spellCheck={false} disabled={!canWrite} /><Button type="submit" disabled={!canWrite || !voterAddress.trim()}><Users size={15} />Inscrire</Button></div>
        <p className="field-hint">L’électeur utilisera ce wallet pour proposer et voter.</p>
        {!voting.isVoter && <div className="owner-self"><span>Pour participer vous aussi, inscrivez votre propre adresse.</span><Button size="sm" variant="outline" type="button" disabled={!canWrite} onClick={() => voting.address && void registerVoter(voting.address)}>M’inscrire</Button></div>}
      </form>}
      <div className="transition-row"><div><span className="mini-label">PROCHAINE ÉTAPE</span><p>{TRANSITIONS[status]?.description}</p></div><Button variant="outline" disabled={!canWrite} onClick={() => { const transition = TRANSITIONS[status]; if (transition) setConfirmation({ ...transition, title: transition.label }); }}>{TRANSITIONS[status]?.label}<ArrowRight size={15} /></Button></div>
    </Card>
  );

  const results = snapshot && status === 5 && (() => {
    const winner = snapshot.proposals.find(proposal => proposal.id === snapshot.winnerId);
    const highest = snapshot.proposals.reduce((max, proposal) => proposal.voteCount > max ? proposal.voteCount : max, 0n);
    const tied = snapshot.proposals.filter(proposal => proposal.voteCount === highest);
    const ranked = [...snapshot.proposals].sort((a, b) => a.voteCount === b.voteCount ? Number(a.id - b.id) : a.voteCount > b.voteCount ? -1 : 1);
    return <Card className="surface-card results-card">
      <div className="card-heading"><span className="icon-square teal"><Flag size={20} /></span><div><h3>Le résultat du scrutin</h3><p>{totalVotes.toString()} vote{totalVotes !== 1n ? "s" : ""} enregistré{totalVotes !== 1n ? "s" : ""} · {participation.toLocaleString("fr-FR")} % de participation</p></div><Badge className="status-badge">Définitif</Badge></div>
      <div className="winner-box"><span className="mini-label">{totalVotes === 0n ? "AUCUN VOTE ENREGISTRÉ" : tied.length > 1 ? "ÉGALITÉ · RÉSULTAT DU CONTRAT" : "PROPOSITION RETENUE"}</span><h3>{totalVotes === 0n ? "Le scrutin s’est terminé sans vote." : winner?.description ?? "Résultat indisponible"}</h3><p>{totalVotes === 0n ? "Le contrat retourne la proposition #0 par défaut. Aucune proposition n’a reçu de voix." : tied.length > 1 ? `En cas d’égalité, le contrat retient la proposition au plus petit identifiant : #${snapshot.winnerId}.` : `Proposition #${snapshot.winnerId} · ${winner?.voteCount.toString() ?? "0"} voix`}</p></div>
      <div className="result-list">{ranked.map(proposal => <div className="result-row" key={proposal.id.toString()}><div className="result-label"><span><span className="muted">#{proposal.id.toString()}</span> {proposal.description}</span><strong>{percentage(proposal.voteCount, totalVotes).toLocaleString("fr-FR")} % <span className="muted">· {proposal.voteCount.toString()} voix</span></strong></div><Progress value={percentage(proposal.voteCount, totalVotes)} className={proposal.id === snapshot.winnerId && totalVotes > 0n ? "winner-progress" : ""} /></div>)}</div>
    </Card>;
  })();

  function renderProposal(proposal: Proposal, compact = false) {
    const isGenesis = proposal.id === 0n && proposal.description === "GENESIS";
    const isSelected = proposal.id === selectedProposal;
    const canVote = status === 3 && voting.isVoter && !voting.hasVoted;
    return <Card className={`proposal-card ${compact ? "compact-proposal" : ""} ${isSelected ? "selected-proposal" : ""}`} key={proposal.id.toString()}>
      <div className="proposal-top"><span className="proposal-number">PROPOSITION <strong>#{proposal.id.toString().padStart(2, "0")}</strong></span>{isGenesis ? <Badge variant="outline" className="genesis-badge">Initiale</Badge> : <span className="proposal-symbol"><FileText size={17} /></span>}</div>
      <h3>{proposal.description}</h3>
      {isGenesis && <p className="genesis-note">Proposition « GENESIS » créée automatiquement par le contrat. Elle peut recevoir des votes.</p>}
      <div className="proposal-bottom"><span className="proposal-votes"><Vote size={15} />{proposal.voteCount.toString()} voix</span>{canVote ? <Button size="sm" variant={isSelected ? "default" : "outline"} disabled={!canWrite} aria-pressed={isSelected} onClick={() => { setSelectedProposal(proposal.id); if (compact) setSection("proposals"); }}>{isSelected ? <Check size={14} /> : null}{isSelected ? "Sélectionnée" : "Choisir"}</Button> : ownVoter?.hasVoted && ownVoter.votedProposalId === proposal.id ? <Badge className="status-badge"><Check size={12} />Votre vote</Badge> : status === 5 && proposal.id === snapshot?.winnerId && totalVotes > 0n ? <Badge className="status-badge"><Flag size={12} />Retenue</Badge> : <span className="proposal-readonly">{status < 3 ? "En attente du vote" : status === 3 ? "Vote en cours" : "Vote clôturé"}</span>}</div>
    </Card>;
  }

  function renderActivity(limit?: number) {
    const entries = limit ? snapshot?.activity.slice(0, limit) : snapshot?.activity;
    if (!entries?.length) return <EmptyState icon={ActivityIcon} title="L’histoire du scrutin commence ici">Les inscriptions, propositions, votes et changements d’étape apparaîtront ici après leur confirmation.</EmptyState>;
    return <div className="activity-list">{entries.map(entry => { const Icon = activityIcons[entry.kind]; return <div className="activity-row" key={entry.id}><span className={`activity-icon activity-${entry.kind}`}><Icon size={17} /></span><div className="activity-detail"><h4>{entry.title}</h4><p>{entry.detail}</p><span className="activity-block">Bloc {entry.blockNumber.toLocaleString("fr-FR")}</span></div>{voting.explorerUrl ? <a className="activity-link" href={`${voting.explorerUrl}/tx/${entry.transactionHash}`} target="_blank" rel="noreferrer" aria-label={`Voir la transaction : ${entry.title}`}><ArrowUpRight size={17} /></a> : <CheckCircle2 className="activity-confirmed" size={16} aria-label="Confirmé" />}</div>; })}</div>;
  }

  return <Tabs value={section} onValueChange={value => { setSection(value as Section); setFormError(null); }} orientation="vertical" className="app-shell">
    <aside className="sidebar">
      <Link className="brand" href="/" aria-label="Trust, accueil"><span className="brand-mark"><Vote size={24} strokeWidth={2.2} /></span><span>Trust</span></Link>
      <div className="sidebar-caption">VOTRE ESPACE DE VOTE</div>
      <TabsList className="side-nav" aria-label="Navigation principale">{navigation.map(({ value, label, icon: Icon }) => <TabsTrigger value={value} className="side-nav-item" aria-label={label} key={value}><Icon size={19} strokeWidth={1.7} /><span>{label}</span>{value === "proposals" && snapshot && <span className="nav-count">{snapshot.proposals.length}</span>}</TabsTrigger>)}</TabsList>
      <div className="sidebar-bottom"><div className="sidebar-help"><span className="help-illustration"><Sparkles size={25} strokeWidth={1.5} /></span><h3>Un vote, une voix.</h3><p>Un espace commun pour faire avancer vos idées.</p><button onClick={() => setHelpOpen(true)}>Comment ça marche <ArrowUpRight size={14} /></button></div><div className="sidebar-network"><span className={`network-dot ${voting.configured ? "" : "network-off"}`} /><div><strong>{voting.chainName}</strong><span>{voting.configured ? "Données de la blockchain" : "Contrat à configurer"}</span></div><ShieldCheck size={17} /></div></div>
    </aside>

    <div className="workspace">
      <header className="topbar"><div className="breadcrumb">Espace de vote<ChevronRight size={13} /><strong>{navigation.find(item => item.value === section)?.label}</strong></div><div className="topbar-actions"><button className="icon-button help-button" aria-label="Comprendre le fonctionnement" onClick={() => setHelpOpen(true)}><CircleHelp size={20} /></button><WalletButton /></div></header>
      <main className="main-content">
        <div className="page-heading"><div><div className="eyebrow"><span className="eyebrow-line" />LA DÉCISION VOUS APPARTIENT</div><h1>{section === "overview" ? <>Chaque voix compte<span>.</span></> : section === "proposals" ? <>Les idées prennent vie<span>.</span></> : section === "voters" ? <>Une communauté, une voix<span>.</span></> : <>Tout est transparent<span>.</span></>}</h1><p>{section === "overview" ? "Proposez, participez et décidez. Ensemble, simplement." : section === "proposals" ? "Découvrez les propositions et faites entendre votre choix." : section === "voters" ? "Retrouvez les adresses autorisées à participer au scrutin." : "Suivez les actions confirmées dans la blockchain."}</p></div><Button variant="outline" size="sm" className="refresh-button" onClick={() => voting.refresh()} disabled={voting.isFetching || !voting.configured}><RefreshCw size={14} className={voting.isFetching ? "spinning" : ""} />Actualiser</Button></div>

        {!voting.configured && <Card className="configuration-notice"><span className="icon-square orange"><Layers3 size={22} /></span><div><h2>Votre espace est prêt. Il reste à lancer le scrutin.</h2><p>Aucun contrat n’est configuré sur {voting.chainName}. Lancez le déploiement local avec les instructions du README, puis renseignez l’adresse du contrat pour afficher les données.</p><span className="notice-footnote">La connexion au wallet reste disponible. Aucune donnée de démonstration n’est affichée.</span></div></Card>}
        {voting.error && <div className="notice error-notice" role="alert"><CircleAlert size={20} /><div><strong>Les données n’ont pas pu être actualisées</strong><p>{voting.error}</p><p>Les actions sont suspendues jusqu’à la prochaine lecture réussie.</p></div><Button variant="outline" size="sm" onClick={() => voting.refresh()} disabled={voting.isFetching}>Réessayer</Button></div>}
        {voting.isWrongNetwork && <div className="notice warning-notice"><CircleAlert size={20} /><div><strong>Votre wallet utilise un autre réseau</strong><p>Passez sur {voting.chainName} pour participer à ce scrutin.</p></div><Button size="sm" onClick={voting.switchNetwork} disabled={voting.isPending}>Changer de réseau<ArrowRight size={14} /></Button></div>}
        {formError && <div className="notice error-notice" role="alert"><CircleAlert size={18} /><p>{formError}</p><button className="icon-button" onClick={() => setFormError(null)} aria-label="Fermer le message"><X size={15} /></button></div>}
        {transaction.status !== "idle" && <div className={`notice transaction-notice transaction-${transaction.status}`} role={transaction.status === "error" ? "alert" : "status"}>{transaction.status === "signature" || transaction.status === "confirming" ? <LoaderCircle className="spinning" size={20} /> : transaction.status === "error" ? <CircleAlert size={20} /> : <CheckCircle2 size={20} />}<div><strong>{transaction.status === "signature" ? "Confirmez dans votre wallet" : transaction.status === "confirming" ? "Transaction envoyée, confirmation en cours…" : transaction.status === "success" ? "Votre action a été confirmée" : "Action non confirmée"}</strong><p>{transaction.status === "error" ? transaction.error : transaction.label}</p></div>{transactionUrl && <a href={transactionUrl} target="_blank" rel="noreferrer">Voir la transaction<ExternalLink size={14} /></a>}</div>}

        {voting.isLoading && !snapshot ? <div className="loading-state" role="status"><LoaderCircle size={26} className="spinning" /><h2>Lecture du scrutin…</h2><p>Nous récupérons les données et l’historique du contrat.</p></div> : snapshot ? <>
          <TabsContent value="overview" className="section-content">
            <section className="phase-hero"><div className="hero-text"><span className="hero-kicker"><span className="hero-dot" />VOTRE SCRUTIN, EN DIRECT</span><h2>{phase.label}</h2><p>{phase.description}</p><div className="hero-bottom"><span className="hero-step">ÉTAPE <strong>{status + 1}</strong><span>/ 6</span></span><button onClick={() => setSection(status === 0 ? "voters" : "proposals")}>{status === 0 ? "Voir les électeurs" : status === 5 ? "Consulter les résultats" : "Voir les propositions"}<ArrowUpRight size={17} /></button></div></div><div className="ballot-scene" aria-hidden="true"><span className="ballot-orbit orbit-one" /><span className="ballot-orbit orbit-two" /><span className="ballot-spark spark-one">✦</span><span className="ballot-spark spark-two">✦</span><span className="ballot-paper"><Check size={36} strokeWidth={3} /><span /><span /></span><span className="ballot-box"><span className="ballot-slot" /><span className="ballot-front"><Vote size={36} strokeWidth={1.5} /></span></span><span className="floating-check"><Check size={18} strokeWidth={3} /></span></div></section>
            <div className="stats-grid"><Card className="stat-card"><span className="stat-icon lavender"><Users size={20} /></span><span className="stat-label">Électeurs inscrits</span><strong>{voterCount.toLocaleString("fr-FR")}</strong><span className="stat-note">{status === 0 ? "Les inscriptions sont ouvertes" : "La liste électorale est clôturée"}</span></Card><Card className="stat-card"><span className="stat-icon peach"><Layers3 size={20} /></span><span className="stat-label">Propositions</span><strong>{snapshot.proposals.length.toLocaleString("fr-FR")}</strong><span className="stat-note">{snapshot.proposals.length > 0 ? "Proposition initiale incluse" : "Les idées arrivent bientôt"}</span></Card><Card className="stat-card"><span className="stat-icon mint"><Vote size={20} /></span><span className="stat-label">Votes exprimés</span><strong>{totalVotes.toLocaleString("fr-FR")}</strong><span className="stat-note">Une voix par électeur</span></Card><Card className="stat-card"><span className="stat-icon sand"><BarChart3 size={20} /></span><span className="stat-label">Participation</span><strong>{participation.toLocaleString("fr-FR")}<small> %</small></strong><Progress value={participation} aria-label={`${participation} pour cent de participation`} /></Card></div>
            <Card className="surface-card timeline-card"><div className="section-heading"><div><span className="mini-label">UN PARCOURS EN TOUTE CLARTÉ</span><h2>Les étapes du scrutin</h2></div><Badge className="step-badge">{status === 5 ? "Terminé" : `Étape ${status + 1} sur 6`}</Badge></div><ol className="timeline">{PHASES.map((item, index) => <li key={item.short} className={index < status ? "completed" : index === status ? "current" : "upcoming"} aria-current={index === status ? "step" : undefined}><span className="timeline-node">{index < status ? <Check size={14} strokeWidth={3} /> : index + 1}</span><span className="timeline-label">{item.short}</span><span className="timeline-status">{index < status ? "Terminée" : index === status ? status === 5 ? "Publiés" : "En cours" : "À venir"}</span></li>)}</ol></Card>
            {results}
            <div className="overview-grid"><div className="overview-main"><div className="section-heading"><div><h2>Les propositions</h2><p>Des idées pour construire la suite.</p></div><button className="text-link" onClick={() => setSection("proposals")}>Tout voir<ArrowRight size={15} /></button></div>{snapshot.proposals.length ? <div className="overview-proposals">{snapshot.proposals.slice(-2).reverse().map(proposal => renderProposal(proposal, true))}</div> : <Card className="surface-card"><EmptyState icon={Layers3} title="Les meilleures idées sont à venir">Les propositions apparaîtront lorsque les électeurs pourront les déposer.</EmptyState></Card>}{ownerControls}</div><Card className="surface-card account-card"><div className="card-heading"><span className="icon-square lavender"><Fingerprint size={21} /></span><h3>Votre participation</h3></div>{!voting.isConnected ? <><div className="account-intro"><span className="account-main-icon"><Wallet size={30} strokeWidth={1.4} /></span><h3>Faites partie de la décision.</h3><p>Connectez votre wallet pour connaître votre rôle et participer au scrutin.</p></div><WalletButton /><span className="account-note"><LockKeyhole size={12} />Consulter le scrutin est libre.</span></> : <><div className="account-identity"><span className="wallet-avatar" /><span>{voting.address && shortAddress(voting.address)}</span><button className="icon-button" onClick={() => voting.address && void copy(voting.address)} aria-label="Copier mon adresse">{copied === voting.address ? <Check size={14} /> : <Copy size={14} />}</button></div><div className="role-list">{voting.isOwner && <Badge className="role-badge"><ShieldCheck size={12} />Administrateur</Badge>}<Badge variant="outline" className={voting.isVoter ? "status-badge" : "visitor-badge"}>{voting.isVoter ? <CheckCircle2 size={12} /> : <CircleUserRound size={12} />}{voting.isVoter ? "Électeur inscrit" : "Visiteur"}</Badge></div><div className="account-state"><span className={`account-state-symbol ${voting.hasVoted ? "voted" : ""}`}>{voting.hasVoted ? <CheckCheck size={25} /> : <Vote size={25} />}</span><h3>{voting.hasVoted ? "Votre voix est enregistrée." : voting.isVoter ? status === 3 ? "C’est le moment de voter." : status > 3 ? "Le scrutin est clôturé." : "Vous êtes dans la liste !" : status === 0 ? "Rejoignez le scrutin." : "Vous suivez ce scrutin."}</h3><p>{voting.hasVoted ? `Vous avez voté pour la proposition #${ownVoter?.votedProposalId?.toString() ?? ""}${myVote ? ` : ${myVote.description}` : "."}` : voting.isVoter ? status === 1 ? "Vous pouvez dès maintenant déposer vos propositions." : status === 3 ? "Parcourez les propositions, puis confirmez votre choix." : status > 3 ? "Consultez les propositions et les résultats disponibles." : "Les propositions et le vote s’ouvriront aux prochaines étapes." : status === 0 ? "Demandez à l’administrateur d’inscrire l’adresse de votre wallet." : "Les inscriptions sont terminées. Vous pouvez consulter les données publiques."}</p></div>{voting.isVoter && (status === 1 || status === 3) && !voting.hasVoted && <Button className="full-width" onClick={() => setSection("proposals")}>{status === 1 ? "Déposer une proposition" : "Découvrir les propositions"}<ArrowRight size={15} /></Button>}{voting.isOwner && !voting.isVoter && status === 0 && <Button variant="outline" className="full-width" disabled={!canWrite} onClick={() => voting.address && void registerVoter(voting.address)}>Inscrire mon adresse<ArrowRight size={15} /></Button>}</>}</Card></div>
            <Card className="surface-card recent-activity"><div className="section-heading"><div><h2>Dernières activités</h2><p>Chaque action laisse une trace.</p></div><button className="text-link" onClick={() => setSection("activity")}>Tout l’historique<ArrowRight size={15} /></button></div>{renderActivity(4)}</Card>
          </TabsContent>

          <TabsContent value="proposals" className="section-content">
            {results}
            {status === 1 && voting.isVoter && <Card className="surface-card proposal-form-card"><div className="card-heading"><span className="icon-square orange"><FileText size={20} /></span><div><h2>Une idée à partager ?</h2><p>Votre proposition sera visible par tous les participants.</p></div><Badge className="status-badge">Dépôts ouverts</Badge></div><form onSubmit={event => { event.preventDefault(); void submitProposal(); }}><label htmlFor="proposal-description">Votre proposition</label><Textarea id="proposal-description" placeholder="Décrivez votre idée de manière claire et précise…" rows={4} value={proposalText} onChange={event => { setProposalText(event.target.value); setFormError(null); }} disabled={!canWrite} maxLength={2000} /><div className="proposal-form-footer"><span>Une proposition publiée ne peut plus être modifiée. <span className="character-count">{proposalText.length} / 2 000 caractères</span></span><Button type="submit" disabled={!canWrite || !proposalText.trim()}><ArrowUpRight size={16} />Publier ma proposition</Button></div></form></Card>}
            {status === 3 && <div className={`notice ${voting.hasVoted ? "success-notice" : "soft-notice"}`}><Vote size={20} /><div><strong>{voting.hasVoted ? "Merci, votre vote est enregistré." : "Le vote est ouvert."}</strong><p>{voting.hasVoted ? "Votre choix est définitif. Vous pouvez suivre le scrutin jusqu’à la publication des résultats." : voting.isVoter ? "Sélectionnez une proposition, puis confirmez votre vote avec votre wallet." : "Seuls les électeurs préalablement inscrits peuvent voter."}</p></div></div>}
            {!voting.isConnected && (status === 1 || status === 3) && <div className="notice soft-notice"><Wallet size={20} /><div><strong>Connectez votre wallet pour participer</strong><p>Les propositions restent consultables par tous.</p></div><WalletButton /></div>}
            <div className="section-heading list-heading"><div><h2>Toutes les propositions <span className="title-count">{snapshot.proposals.length}</span></h2><p>{status === 0 ? "Le dépôt n’a pas encore commencé." : "Consultez les idées déposées sur la blockchain."}</p></div><div className="search-field"><Search size={16} /><Input aria-label="Rechercher une proposition" placeholder="Rechercher une idée…" value={proposalSearch} onChange={event => setProposalSearch(event.target.value)} /></div></div>
            {filteredProposals.length ? <div className="proposals-grid">{filteredProposals.map(proposal => renderProposal(proposal))}</div> : <Card className="surface-card"><EmptyState icon={Layers3} title={proposalSearch ? "Aucune proposition ne correspond" : "Une page blanche, pour le moment"}>{proposalSearch ? "Essayez un autre mot ou un identifiant de proposition." : status === 0 ? "L’administrateur doit ouvrir la phase de dépôt avant l’ajout des premières propositions." : "Les propositions s’afficheront dès leur confirmation."}</EmptyState></Card>}
            {status === 3 && voting.isVoter && !voting.hasVoted && selected && <div className="vote-selection"><div><span className="selection-check"><Check size={18} /></span><div><span>VOTRE CHOIX</span><strong>#{selected.id.toString()} · {selected.description}</strong></div></div><Button disabled={!canWrite} onClick={() => requestVote(selected)}><Vote size={17} />Confirmer mon vote<ArrowRight size={16} /></Button></div>}
            {ownerControls}
          </TabsContent>

          <TabsContent value="voters" className="section-content">
            {ownerControls}
            <Card className="surface-card voters-card"><div className="section-heading list-heading"><div><h2>La liste électorale <span className="title-count">{voterCount}</span></h2><p>{status === 0 ? "L’administrateur peut encore inscrire des électeurs." : "La liste des électeurs est définitivement clôturée."}</p></div><div className="search-field"><Search size={16} /><Input aria-label="Rechercher un électeur par adresse" placeholder="Rechercher une adresse…" value={voterSearch} onChange={event => setVoterSearch(event.target.value)} /></div></div>{filteredVoters.length ? <div className="table-overflow"><table className="voters-table"><thead><tr><th>Électeur</th><th>Rôle</th><th>Participation</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{filteredVoters.map((voter, index) => <tr key={voter.address}><td><div className="voter-identity"><span className={`voter-avatar avatar-${index % 4}`}><CircleUserRound size={19} /></span><div><code>{voter.address}</code>{voter.address.toLowerCase() === voting.address?.toLowerCase() && <span className="you-label">Vous</span>}</div></div></td><td><span className="table-role">{voter.address.toLowerCase() === snapshot.owner.toLowerCase() ? "Administrateur · Électeur" : "Électeur"}</span></td><td><Badge className={voter.hasVoted ? "status-badge" : "pending-badge"}>{voter.hasVoted ? <Check size={12} /> : <span className="small-dot" />}{voter.hasVoted ? "A voté" : status < 3 ? "Inscrit" : status === 3 ? "En attente" : "N’a pas voté"}</Badge></td><td><button className="icon-button" onClick={() => void copy(voter.address)} aria-label={`Copier l’adresse ${voter.address}`}>{copied === voter.address ? <Check size={15} /> : <Copy size={15} />}</button></td></tr>)}</tbody></table></div> : <EmptyState icon={Users} title={voterSearch ? "Aucune adresse ne correspond" : "Le premier électeur, c’est pour bientôt"}>{voterSearch ? "Vérifiez l’adresse saisie ou effacez votre recherche." : "L’administrateur inscrit les adresses des wallets qui pourront participer."}</EmptyState>}</Card>
            <div className="plain-note"><ShieldCheck size={17} /><p>L’administrateur gère le scrutin. Pour proposer ou voter, son adresse doit également figurer dans cette liste.</p></div>
          </TabsContent>

          <TabsContent value="activity" className="section-content"><Card className="surface-card full-activity"><div className="section-heading"><div><h2>L’historique du scrutin <span className="title-count">{snapshot.activity.length}</span></h2><p>Des actions confirmées, consultables et vérifiables.</p></div><Badge variant="outline" className="verified-badge"><ShieldCheck size={13} />Sur la blockchain</Badge></div>{renderActivity()}</Card><div className="plain-note"><Fingerprint size={17} /><p>Les événements sont présentés du plus récent au plus ancien. Les adresses et les votes enregistrés sur cette blockchain sont publics.</p></div></TabsContent>
        </> : !voting.isLoading && voting.configured && !voting.error ? <Card className="surface-card"><EmptyState icon={RefreshCw} title="En attente du contrat">Actualisez la page pour charger les informations du scrutin.</EmptyState></Card> : null}

        <footer className="page-footer"><div><span className="footer-logo">Trust</span><span>La confiance est collective.</span></div><div><span className="footer-network"><span className="network-dot" />{voting.chainName}</span>{voting.contractAddress && (voting.explorerUrl ? <a href={`${voting.explorerUrl}/address/${voting.contractAddress}`} target="_blank" rel="noreferrer" title={voting.contractAddress}>Contrat {shortAddress(voting.contractAddress)}<ExternalLink size={12} /></a> : <button title={voting.contractAddress} onClick={() => voting.contractAddress && void copy(voting.contractAddress)}>Contrat {shortAddress(voting.contractAddress)}{copied === voting.contractAddress ? <Check size={12} /> : <Copy size={12} />}</button>)}</div></footer>
      </main>
    </div>

    <AlertDialog open={!!confirmation} onOpenChange={open => { if (!open && !voting.isPending) setConfirmation(null); }}><AlertDialogContent className="confirmation-dialog"><AlertDialogHeader><span className="dialog-symbol"><span>{confirmation?.action === "setVote" ? <Vote size={26} /> : <Flag size={26} />}</span></span><AlertDialogTitle>{confirmation?.title}</AlertDialogTitle><AlertDialogDescription>{confirmation?.description}</AlertDialogDescription></AlertDialogHeader>{confirmation?.proposal && <div className="confirm-proposal"><span>PROPOSITION #{confirmation.proposal.id.toString()}</span><strong>{confirmation.proposal.description}</strong>{confirmation.proposal.id === 0n && confirmation.proposal.description === "GENESIS" && <p>Vous choisissez la proposition initiale créée par le contrat.</p>}</div>}<p className="dialog-footnote"><LockKeyhole size={14} />Cette action nécessite une confirmation dans votre wallet et des frais de réseau.</p>{transaction.status === "error" && <p className="dialog-error" role="alert">{transaction.error}</p>}<AlertDialogFooter><AlertDialogCancel disabled={voting.isPending}>Revenir</AlertDialogCancel><Button disabled={!canWrite} onClick={() => void confirmAction()}>{voting.isPending ? <LoaderCircle size={16} className="spinning" /> : <Check size={16} />}{voting.isPending ? "Confirmation en cours…" : confirmation?.action === "setVote" ? "Oui, confirmer mon vote" : "Confirmer cette étape"}</Button></AlertDialogFooter></AlertDialogContent></AlertDialog>
    <AlertDialog open={helpOpen} onOpenChange={setHelpOpen}><AlertDialogContent className="help-dialog"><AlertDialogHeader><span className="dialog-symbol"><span><Sparkles size={26} /></span></span><AlertDialogTitle>Vos idées. Votre voix. Notre décision.</AlertDialogTitle><AlertDialogDescription>Trust accompagne les six étapes d’un scrutin. Chacun peut en consulter le déroulement librement.</AlertDialogDescription></AlertDialogHeader><ol className="help-steps"><li><span>01</span><div><strong>Rejoignez la liste électorale</strong><p>Connectez votre wallet et transmettez son adresse à l’administrateur pour vous inscrire.</p></div></li><li><span>02</span><div><strong>Partagez vos propositions</strong><p>Pendant le dépôt, les électeurs inscrits peuvent publier leurs idées. Elles restent sur la blockchain.</p></div></li><li><span>03</span><div><strong>Exprimez votre choix</strong><p>Lorsque le vote ouvre, chaque électeur peut voter une seule fois. Le vote est définitif et public.</p></div></li><li><span>04</span><div><strong>Découvrez le résultat</strong><p>Après la clôture et le comptage par l’administrateur, tous peuvent consulter le résultat. En cas d’égalité, le contrat retient le plus petit identifiant.</p></div></li></ol><AlertDialogFooter><AlertDialogCancel className="help-close">C’est compris<ArrowRight size={15} /></AlertDialogCancel></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </Tabs>;
}
