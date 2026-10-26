// Définit la licence du code
// SPDX-License-Identifier: MIT

// Définit la version du compilateur Solidity
pragma solidity ^0.8.34;

// Importe l'interface ERC20 pour interagir avec un token existant
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// Déclare notre smart contract
contract useErc20 {

    // Déclare une variable qui permettra de référencer un contrat ERC20
    IERC20 ourToken;

    // Fonction permettant d'enregistrer l'adresse du contrat ERC20
    // _addr correspond à l'adresse du contrat externe
    function setTokenAdresse(address _addr) external {

        // Associe l'adresse fournie à la variable ourToken
        ourToken = IERC20(_addr);
    }

    // Fonction permettant de transférer des tokens depuis une autre adresse
    // _to = adresse du destinataire
    // _value = quantité de tokens à transférer
    function transferToken(address _to, uint256 _value) external {

        // Vérifie que l'appelant a autorisé notre contrat
        // à dépenser au moins _value tokens pour le destinataire _to
        require(
            ourToken.allowance(msg.sender, address(this)) >= _value,
            "Pas assez d'allowance"
        );

        // Demande au contrat ERC20 de transférer les tokens
        // depuis msg.sender vers _to
        // Notre contrat doit avoir été autorisé à dépenser ces tokens
        ourToken.transferFrom(msg.sender, _to, _value);
    }
}