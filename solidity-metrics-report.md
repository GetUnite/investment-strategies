
[<img width="200" alt="get in touch with Consensys Diligence" src="https://user-images.githubusercontent.com/2865694/56826101-91dcf380-685b-11e9-937c-af49c2510aa0.png">](https://diligence.consensys.net)<br/>
<sup>
[[  🌐  ](https://diligence.consensys.net)  [  📩  ](mailto:diligence@consensys.net)  [  🔥  ](https://consensys.github.io/diligence/)]
</sup><br/><br/>



# Solidity Metrics for GetAlluo/investment-strategies

## Table of contents

- [Scope](#t-scope)
    - [Source Units in Scope](#t-source-Units-in-Scope)
    - [Out of Scope](#t-out-of-scope)
        - [Excluded Source Units](#t-out-of-scope-excluded-source-units)
        - [Duplicate Source Units](#t-out-of-scope-duplicate-source-units)
        - [Doppelganger Contracts](#t-out-of-scope-doppelganger-contracts)
- [Report Overview](#t-report)
    - [Risk Summary](#t-risk)
    - [Source Lines](#t-source-lines)
    - [Inline Documentation](#t-inline-documentation)
    - [Components](#t-components)
    - [Exposed Functions](#t-exposed-functions)
    - [StateVariables](#t-statevariables)
    - [Capabilities](#t-capabilities)
    - [Dependencies](#t-package-imports)
    - [Totals](#t-totals)

## <span id=t-scope>Scope</span>

This section lists files that are in scope for the metrics report. 

- **Project:** `GetAlluo/investment-strategies`
- **Included Files:** 
    - ``
- **Excluded Paths:** 
    - ``
- **File Limit:** `undefined`
    - **Exclude File list Limit:** `undefined`

- **Workspace Repository:** `unknown` (`undefined`@`undefined`)

### <span id=t-source-Units-in-Scope>Source Units in Scope</span>

Source Units Analyzed: **`10`**<br>
Source Units in Scope: **`10`** (**100%**)

| Type | File   | Logic Contracts | Interfaces | Lines | nLines | nSLOC | Comment Lines | Complex. Score | Capabilities |
|========|=================|============|=======|=======|===============|==============|  
| 📝 | contracts\CurveConvexStrategyV2.sol | 1 | **** | 445 | 364 | 269 | 54 | 195 | **<abbr title='Uses Hash-Functions'>🧮</abbr>** |
| 📝 | contracts\CurveConvexStrategyV2Native.sol | 1 | **** | 500 | 418 | 313 | 56 | 242 | **<abbr title='Payable Functions'>💰</abbr><abbr title='Uses Hash-Functions'>🧮</abbr>** |
| 📝 | contracts\StrategyHandler.sol | 1 | **** | 532 | 457 | 392 | 5 | 305 | **<abbr title='Initiates ETH Value Transfer'>📤</abbr><abbr title='Uses Hash-Functions'>🧮</abbr>** |
| 🔍 | contracts\interfaces\IAlluoStrategyV2.sol | **** | 1 | 58 | 11 | 4 | 21 | 15 | **** |
| 🔍 | contracts\interfaces\ICvxBaseRewardPool.sol | **** | 1 | 86 | 9 | 3 | 4 | 73 | **** |
| 🔍 | contracts\interfaces\ICvxBooster.sol | **** | 1 | 169 | 11 | 3 | 5 | 113 | **** |
| 🔍 | contracts\interfaces\IExchange.sol | **** | 1 | 42 | 16 | 13 | 7 | 16 | **<abbr title='Payable Functions'>💰</abbr>** |
| 🔍 | contracts\interfaces\IIbAlluo.sol | **** | 1 | 95 | 8 | 5 | 1 | 71 | **** |
| 🔍 | contracts\interfaces\IPriceFeedRouterV2.sol | **** | 1 | 106 | 27 | 23 | 6 | 52 | **<abbr title='Payable Functions'>💰</abbr>** |
| 🔍 | contracts\interfaces\IWrappedEther.sol | **** | 1 | 30 | 5 | 3 | 1 | 26 | **<abbr title='Payable Functions'>💰</abbr>** |
| 📝🔍 | **Totals** | **3** | **7** | **2063**  | **1326** | **1028** | **160** | **1108** | **<abbr title='Payable Functions'>💰</abbr><abbr title='Initiates ETH Value Transfer'>📤</abbr><abbr title='Uses Hash-Functions'>🧮</abbr>** |

<sub>
Legend: <a onclick="toggleVisibility('table-legend', this)">[➕]</a>
<div id="table-legend" style="display:none">

<ul>
<li> <b>Lines</b>: total lines of the source unit </li>
<li> <b>nLines</b>: normalized lines of the source unit (e.g. normalizes functions spanning multiple lines) </li>
<li> <b>nSLOC</b>: normalized source lines of code (only source-code lines; no comments, no blank lines) </li>
<li> <b>Comment Lines</b>: lines containing single or block comments </li>
<li> <b>Complexity Score</b>: a custom complexity score derived from code statements that are known to introduce code complexity (branches, loops, calls, external interfaces, ...) </li>
</ul>

</div>
</sub>


#### <span id=t-out-of-scope>Out of Scope</span>

##### <span id=t-out-of-scope-excluded-source-units>Excluded Source Units</span>

Source Units Excluded: **`0`**

<a onclick="toggleVisibility('excluded-files', this)">[➕]</a>
<div id="excluded-files" style="display:none">
| File   |
|========|
| None |

</div>


##### <span id=t-out-of-scope-duplicate-source-units>Duplicate Source Units</span>

Duplicate Source Units Excluded: **`0`** 

<a onclick="toggleVisibility('duplicate-files', this)">[➕]</a>
<div id="duplicate-files" style="display:none">
| File   |
|========|
| None |

</div>

##### <span id=t-out-of-scope-doppelganger-contracts>Doppelganger Contracts</span>

Doppelganger Contracts: **`0`** 

<a onclick="toggleVisibility('doppelganger-contracts', this)">[➕]</a>
<div id="doppelganger-contracts" style="display:none">
| File   | Contract | Doppelganger | 
|========|==========|==============|


</div>


## <span id=t-report>Report</span>

### Overview

The analysis finished with **`0`** errors and **`0`** duplicate files.





#### <span id=t-risk>Risk</span>

<div class="wrapper" style="max-width: 512px; margin: auto">
			<canvas id="chart-risk-summary"></canvas>
</div>

#### <span id=t-source-lines>Source Lines (sloc vs. nsloc)</span>

<div class="wrapper" style="max-width: 512px; margin: auto">
    <canvas id="chart-nsloc-total"></canvas>
</div>

#### <span id=t-inline-documentation>Inline Documentation</span>

- **Comment-to-Source Ratio:** On average there are`9.82` code lines per comment (lower=better).
- **ToDo's:** `0` 

#### <span id=t-components>Components</span>

| 📝Contracts   | 📚Libraries | 🔍Interfaces | 🎨Abstract |
|=============|===========|============|============|
| 3 | 0  | 7  | 0 |

#### <span id=t-exposed-functions>Exposed Functions</span>

This section lists functions that are explicitly declared public or payable. Please note that getter methods for public stateVars are not included.  

| 🌐Public   | 💰Payable |
|============|===========|
| 238 | 4  | 

| External   | Internal | Private | Pure | View |
|============|==========|=========|======|======|
| 220 | 134  | 3 | 13 | 105 |

#### <span id=t-statevariables>StateVariables</span>

| Total      | 🌐Public  |
|============|===========|
| 29  | 27 |

#### <span id=t-capabilities>Capabilities</span>

| Solidity Versions observed | 🧪 Experimental Features | 💰 Can Receive Funds | 🖥 Uses Assembly | 💣 Has Destroyable Contracts | 
|============|===========|===========|===========|
| `^0.8.11`<br/>`0.8.14` |  | `yes` | **** | **** | 

| 📤 Transfers ETH | ⚡ Low-Level Calls | 👥 DelegateCall | 🧮 Uses Hash Functions | 🔖 ECRecover | 🌀 New/Create/Create2 |
|============|===========|===========|===========|===========|
| `yes` | **** | **** | `yes` | **** | **** | 

| ♻️ TryCatch | Σ Unchecked |
|============|===========|
| **** | **** |

#### <span id=t-package-imports>Dependencies / External Imports</span>

| Dependency / Import Path | Count  | 
|==========================|========|
| @openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol | 3 |
| @openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol | 3 |
| @openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol | 3 |
| @openzeppelin/contracts-upgradeable/token/ERC20/extensions/IERC20MetadataUpgradeable.sol | 1 |
| @openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol | 1 |
| @openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol | 3 |
| @openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol | 2 |
| @openzeppelin/contracts/access/IAccessControl.sol | 1 |
| @openzeppelin/contracts/interfaces/IERC20.sol | 4 |
| @openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol | 2 |
| hardhat/console.sol | 1 |

#### <span id=t-totals>Totals</span>

##### Summary

<div class="wrapper" style="max-width: 90%; margin: auto">
    <canvas id="chart-num-bar"></canvas>
</div>

##### AST Node Statistics

###### Function Calls

<div class="wrapper" style="max-width: 90%; margin: auto">
    <canvas id="chart-num-bar-ast-funccalls"></canvas>
</div>

###### Assembly Calls

<div class="wrapper" style="max-width: 90%; margin: auto">
    <canvas id="chart-num-bar-ast-asmcalls"></canvas>
</div>

###### AST Total

<div class="wrapper" style="max-width: 90%; margin: auto">
    <canvas id="chart-num-bar-ast"></canvas>
</div>

##### Inheritance Graph

<a onclick="toggleVisibility('surya-inherit', this)">[➕]</a>
<div id="surya-inherit" style="display:none">
<div class="wrapper" style="max-width: 512px; margin: auto">
    <div id="surya-inheritance" style="text-align: center;"></div> 
</div>
</div>

##### CallGraph

<a onclick="toggleVisibility('surya-call', this)">[➕]</a>
<div id="surya-call" style="display:none">
<div class="wrapper" style="max-width: 512px; margin: auto">
    <div id="surya-callgraph" style="text-align: center;"></div>
</div>
</div>

###### Contract Summary

<a onclick="toggleVisibility('surya-mdreport', this)">[➕]</a>
<div id="surya-mdreport" style="display:none">
 Sūrya's Description Report

 Files Description Table


|  File Name  |  SHA-1 Hash  |
|-------------|--------------|
| contracts\CurveConvexStrategyV2.sol | 78e283872ed8239629c19b40914bd7069dcd8552 |
| contracts\CurveConvexStrategyV2Native.sol | dad37115a0e435f172bc6c16b4be94cac54eb8af |
| contracts\StrategyHandler.sol | af5265e080b074ddc0e8f6c5b6cb0204cdbd53df |
| contracts\interfaces\IAlluoStrategyV2.sol | 1f0ce4dd067bb2c21fb1b9ace490f10c2c0c6e75 |
| contracts\interfaces\ICvxBaseRewardPool.sol | 7fc1044001a1413850c9916d99a0d8e7051fc777 |
| contracts\interfaces\ICvxBooster.sol | 264b9034753cfc5f840ed96b5ff0900c743e6ed7 |
| contracts\interfaces\IExchange.sol | eacc53f0cc8f513f79c4a066b42a9900d684ae9c |
| contracts\interfaces\IIbAlluo.sol | bb8673152fceb4711bf926bb9f86037202d4980e |
| contracts\interfaces\IPriceFeedRouterV2.sol | e8534887c807513f5c651a21710e80cd01f53e9a |
| contracts\interfaces\IWrappedEther.sol | 2004ec1b73d9982f0373aeb9af5e7d5a1e71b1a1 |


 Contracts Description Table


|  Contract  |         Type        |       Bases      |                  |                 |
|:----------:|:-------------------:|:----------------:|:----------------:|:---------------:|
|     └      |  **Function Name**  |  **Visibility**  |  **Mutability**  |  **Modifiers**  |
||||||
| **CurveConvexStrategyV2** | Implementation | IAlluoStrategyV2, Initializable, AccessControlUpgradeable, UUPSUpgradeable |||
| └ | <Constructor> | Public ❗️ | 🛑  | initializer |
| └ | initialize | Public ❗️ | 🛑  | initializer |
| └ | invest | External ❗️ | 🛑  | onlyRole |
| └ | exitAll | External ❗️ | 🛑  | onlyRole |
| └ | getDeployedAmountAndRewards | External ❗️ | 🛑  | onlyRole |
| └ | withdrawRewards | Public ❗️ | 🛑  | onlyRole |
| └ | exitOnlyRewards | External ❗️ | 🛑  | onlyRole |
| └ | _exchangeAll | Internal 🔒 | 🛑  | |
| └ | _manageRewardsAndWithdraw | Private 🔐 | 🛑  | |
| └ | getDeployedAmount | External ❗️ |   |NO❗️ |
| └ | encodeEntryParams | External ❗️ |   |NO❗️ |
| └ | encodeExitParams | Public ❗️ |   |NO❗️ |
| └ | encodeRewardsParams | Public ❗️ |   |NO❗️ |
| └ | decodeEntryParams | Public ❗️ |   |NO❗️ |
| └ | decodeExitParams | Public ❗️ |   |NO❗️ |
| └ | decodeRewardsParams | Public ❗️ |   |NO❗️ |
| └ | getCvxRewardPool | Private 🔐 |   | |
| └ | multicall | External ❗️ | 🛑  | onlyRole |
| └ | grantRole | Public ❗️ | 🛑  | onlyRole |
| └ | changeUpgradeStatus | External ❗️ | 🛑  | onlyRole |
| └ | _authorizeUpgrade | Internal 🔒 | 🛑  | onlyRole |
||||||
| **CurveConvexStrategyV2Native** | Implementation | IAlluoStrategyV2, Initializable, AccessControlUpgradeable, UUPSUpgradeable |||
| └ | <Constructor> | Public ❗️ | 🛑  | initializer |
| └ | <Receive Ether> | External ❗️ |  💵 |NO❗️ |
| └ | initialize | Public ❗️ | 🛑  | initializer |
| └ | invest | External ❗️ | 🛑  | onlyRole |
| └ | exitAll | External ❗️ | 🛑  | onlyRole |
| └ | getDeployedAmountAndRewards | External ❗️ | 🛑  | onlyRole |
| └ | withdrawRewards | Public ❗️ | 🛑  | onlyRole |
| └ | exitOnlyRewards | External ❗️ | 🛑  | onlyRole |
| └ | changeAdditionalRewardTokenStatus | External ❗️ | 🛑  | onlyRole |
| └ | getDeployedAmount | External ❗️ |   |NO❗️ |
| └ | _exchangeAll | Internal 🔒 | 🛑  | |
| └ | _manageRewardsAndWithdraw | Internal 🔒 | 🛑  | |
| └ | getCvxRewardPool | Private 🔐 |   | |
| └ | multicall | External ❗️ | 🛑  | onlyRole |
| └ | encodeEntryParams | External ❗️ |   |NO❗️ |
| └ | encodeExitParams | Public ❗️ |   |NO❗️ |
| └ | encodeRewardsParams | Public ❗️ |   |NO❗️ |
| └ | decodeEntryParams | Public ❗️ |   |NO❗️ |
| └ | decodeExitParams | Public ❗️ |   |NO❗️ |
| └ | decodeRewardsParams | Public ❗️ |   |NO❗️ |
| └ | grantRole | Public ❗️ | 🛑  | onlyRole |
| └ | changeUpgradeStatus | External ❗️ | 🛑  | onlyRole |
| └ | _authorizeUpgrade | Internal 🔒 | 🛑  | onlyRole |
||||||
| **StrategyHandler** | Implementation | Initializable, AccessControlUpgradeable, UUPSUpgradeable |||
| └ | <Constructor> | Public ❗️ | 🛑  | initializer |
| └ | initialize | Public ❗️ | 🛑  | initializer |
| └ | calculateAll | External ❗️ | 🛑  | onlyRole |
| └ | calculateOnlyLp | External ❗️ | 🛑  | onlyRole |
| └ | getCurrentDeployed | External ❗️ |   |NO❗️ |
| └ | getLatestDeployed | External ❗️ |   |NO❗️ |
| └ | adjustTreasury | External ❗️ | 🛑  | onlyRole |
| └ | getDirectionIdByName | External ❗️ |   |NO❗️ |
| └ | getDirectionLatestAmount | External ❗️ |   |NO❗️ |
| └ | getLiquidityDirectionByName | External ❗️ |   |NO❗️ |
| └ | getAssetIdByDirectionId | External ❗️ |   |NO❗️ |
| └ | getDirectionFullInfoById | External ❗️ |   |NO❗️ |
| └ | getLiquidityDirectionById | External ❗️ |   |NO❗️ |
| └ | getPrimaryTokenByAssetId | External ❗️ |   |NO❗️ |
| └ | setAssetAmount | External ❗️ | 🛑  | onlyRole |
| └ | getAssetAmount | External ❗️ |   |NO❗️ |
| └ | getAssetActiveIds | External ❗️ |   |NO❗️ |
| └ | getAllAssetActiveIds | External ❗️ |   |NO❗️ |
| └ | addToActiveDirections | External ❗️ | 🛑  | onlyRole |
| └ | removeFromActiveDirections | External ❗️ | 🛑  | onlyRole |
| └ | setGnosis | External ❗️ | 🛑  | onlyRole |
| └ | updateLastTime | External ❗️ | 🛑  | onlyRole |
| └ | setExchangeAddress | External ❗️ | 🛑  | onlyRole |
| └ | setBoosterAddress | External ❗️ | 🛑  | onlyRole |
| └ | setExecutorAddress | External ❗️ | 🛑  | onlyRole |
| └ | setLiquidityDirection | External ❗️ | 🛑  | onlyRole |
| └ | addLiquidityDirection | External ❗️ | 🛑  |NO❗️ |
| └ | setLastDirectionId | External ❗️ | 🛑  | onlyRole |
| └ | changeNumberOfAssets | External ❗️ | 🛑  | onlyRole |
| └ | changeAssetInfo | External ❗️ | 🛑  | onlyRole |
| └ | grantRole | Public ❗️ | 🛑  | onlyRole |
| └ | changeUpgradeStatus | External ❗️ | 🛑  | onlyRole |
| └ | _authorizeUpgrade | Internal 🔒 | 🛑  | onlyRole |
||||||
| **IAlluoStrategyV2** | Interface |  |||
| └ | invest | External ❗️ | 🛑  |NO❗️ |
| └ | exitAll | External ❗️ | 🛑  |NO❗️ |
| └ | getDeployedAmountAndRewards | External ❗️ | 🛑  |NO❗️ |
| └ | exitOnlyRewards | External ❗️ | 🛑  |NO❗️ |
| └ | getDeployedAmount | External ❗️ |   |NO❗️ |
| └ | withdrawRewards | External ❗️ | 🛑  |NO❗️ |
| └ | multicall | External ❗️ | 🛑  |NO❗️ |
||||||
| **ICvxBaseRewardPool** | Interface |  |||
| └ | addExtraReward | External ❗️ | 🛑  |NO❗️ |
| └ | balanceOf | External ❗️ |   |NO❗️ |
| └ | clearExtraRewards | External ❗️ | 🛑  |NO❗️ |
| └ | currentRewards | External ❗️ |   |NO❗️ |
| └ | donate | External ❗️ | 🛑  |NO❗️ |
| └ | duration | External ❗️ |   |NO❗️ |
| └ | earned | External ❗️ |   |NO❗️ |
| └ | extraRewards | External ❗️ |   |NO❗️ |
| └ | extraRewardsLength | External ❗️ |   |NO❗️ |
| └ | getReward | External ❗️ | 🛑  |NO❗️ |
| └ | getReward | External ❗️ | 🛑  |NO❗️ |
| └ | historicalRewards | External ❗️ |   |NO❗️ |
| └ | lastTimeRewardApplicable | External ❗️ |   |NO❗️ |
| └ | lastUpdateTime | External ❗️ |   |NO❗️ |
| └ | newRewardRatio | External ❗️ |   |NO❗️ |
| └ | operator | External ❗️ |   |NO❗️ |
| └ | periodFinish | External ❗️ |   |NO❗️ |
| └ | pid | External ❗️ |   |NO❗️ |
| └ | queueNewRewards | External ❗️ | 🛑  |NO❗️ |
| └ | queuedRewards | External ❗️ |   |NO❗️ |
| └ | rewardManager | External ❗️ |   |NO❗️ |
| └ | rewardPerToken | External ❗️ |   |NO❗️ |
| └ | rewardPerTokenStored | External ❗️ |   |NO❗️ |
| └ | rewardRate | External ❗️ |   |NO❗️ |
| └ | rewardToken | External ❗️ |   |NO❗️ |
| └ | rewards | External ❗️ |   |NO❗️ |
| └ | stake | External ❗️ | 🛑  |NO❗️ |
| └ | stakeAll | External ❗️ | 🛑  |NO❗️ |
| └ | stakeFor | External ❗️ | 🛑  |NO❗️ |
| └ | stakingToken | External ❗️ |   |NO❗️ |
| └ | totalSupply | External ❗️ |   |NO❗️ |
| └ | userRewardPerTokenPaid | External ❗️ |   |NO❗️ |
| └ | withdraw | External ❗️ | 🛑  |NO❗️ |
| └ | withdrawAll | External ❗️ | 🛑  |NO❗️ |
| └ | withdrawAllAndUnwrap | External ❗️ | 🛑  |NO❗️ |
| └ | withdrawAndUnwrap | External ❗️ | 🛑  |NO❗️ |
||||||
| **ICvxBooster** | Interface |  |||
| └ | FEE_DENOMINATOR | External ❗️ |   |NO❗️ |
| └ | MaxFees | External ❗️ |   |NO❗️ |
| └ | addPool | External ❗️ | 🛑  |NO❗️ |
| └ | claimRewards | External ❗️ | 🛑  |NO❗️ |
| └ | crv | External ❗️ |   |NO❗️ |
| └ | deposit | External ❗️ | 🛑  |NO❗️ |
| └ | depositAll | External ❗️ | 🛑  |NO❗️ |
| └ | distributionAddressId | External ❗️ |   |NO❗️ |
| └ | earmarkFees | External ❗️ | 🛑  |NO❗️ |
| └ | earmarkIncentive | External ❗️ |   |NO❗️ |
| └ | earmarkRewards | External ❗️ | 🛑  |NO❗️ |
| └ | feeDistro | External ❗️ |   |NO❗️ |
| └ | feeManager | External ❗️ |   |NO❗️ |
| └ | feeToken | External ❗️ |   |NO❗️ |
| └ | gaugeMap | External ❗️ |   |NO❗️ |
| └ | isShutdown | External ❗️ |   |NO❗️ |
| └ | lockFees | External ❗️ |   |NO❗️ |
| └ | lockIncentive | External ❗️ |   |NO❗️ |
| └ | lockRewards | External ❗️ |   |NO❗️ |
| └ | minter | External ❗️ |   |NO❗️ |
| └ | owner | External ❗️ |   |NO❗️ |
| └ | platformFee | External ❗️ |   |NO❗️ |
| └ | poolInfo | External ❗️ |   |NO❗️ |
| └ | poolLength | External ❗️ |   |NO❗️ |
| └ | poolManager | External ❗️ |   |NO❗️ |
| └ | registry | External ❗️ |   |NO❗️ |
| └ | rewardArbitrator | External ❗️ |   |NO❗️ |
| └ | rewardClaimed | External ❗️ | 🛑  |NO❗️ |
| └ | rewardFactory | External ❗️ |   |NO❗️ |
| └ | setArbitrator | External ❗️ | 🛑  |NO❗️ |
| └ | setFactories | External ❗️ | 🛑  |NO❗️ |
| └ | setFeeInfo | External ❗️ | 🛑  |NO❗️ |
| └ | setFeeManager | External ❗️ | 🛑  |NO❗️ |
| └ | setFees | External ❗️ | 🛑  |NO❗️ |
| └ | setGaugeRedirect | External ❗️ | 🛑  |NO❗️ |
| └ | setOwner | External ❗️ | 🛑  |NO❗️ |
| └ | setPoolManager | External ❗️ | 🛑  |NO❗️ |
| └ | setRewardContracts | External ❗️ | 🛑  |NO❗️ |
| └ | setTreasury | External ❗️ | 🛑  |NO❗️ |
| └ | setVoteDelegate | External ❗️ | 🛑  |NO❗️ |
| └ | shutdownPool | External ❗️ | 🛑  |NO❗️ |
| └ | shutdownSystem | External ❗️ | 🛑  |NO❗️ |
| └ | staker | External ❗️ |   |NO❗️ |
| └ | stakerIncentive | External ❗️ |   |NO❗️ |
| └ | stakerRewards | External ❗️ |   |NO❗️ |
| └ | stashFactory | External ❗️ |   |NO❗️ |
| └ | tokenFactory | External ❗️ |   |NO❗️ |
| └ | treasury | External ❗️ |   |NO❗️ |
| └ | vote | External ❗️ | 🛑  |NO❗️ |
| └ | voteDelegate | External ❗️ |   |NO❗️ |
| └ | voteGaugeWeight | External ❗️ | 🛑  |NO❗️ |
| └ | voteOwnership | External ❗️ |   |NO❗️ |
| └ | voteParameter | External ❗️ |   |NO❗️ |
| └ | withdraw | External ❗️ | 🛑  |NO❗️ |
| └ | withdrawAll | External ❗️ | 🛑  |NO❗️ |
| └ | withdrawTo | External ❗️ | 🛑  |NO❗️ |
||||||
| **IExchange** | Interface |  |||
| └ | exchange | External ❗️ |  💵 |NO❗️ |
| └ | createInternalMajorRoutes | External ❗️ | 🛑  |NO❗️ |
| └ | createLpToken | External ❗️ | 🛑  |NO❗️ |
| └ | createApproval | External ❗️ | 🛑  |NO❗️ |
| └ | registerAdapters | External ❗️ | 🛑  |NO❗️ |
| └ | createMinorCoinEdge | External ❗️ | 🛑  |NO❗️ |
||||||
| **IIbAlluo** | Interface | IERC20, IAccessControl |||
| └ | annualInterest | External ❗️ |   |NO❗️ |
| └ | approveAssetValue | External ❗️ | 🛑  |NO❗️ |
| └ | burn | External ❗️ | 🛑  |NO❗️ |
| └ | changeTokenStatus | External ❗️ | 🛑  |NO❗️ |
| └ | changeUpgradeStatus | External ❗️ | 🛑  |NO❗️ |
| └ | decreaseAllowance | External ❗️ | 🛑  |NO❗️ |
| └ | deposit | External ❗️ | 🛑  |NO❗️ |
| └ | getBalance | External ❗️ |   |NO❗️ |
| └ | getBalanceForTransfer | External ❗️ |   |NO❗️ |
| └ | getListSupportedTokens | External ❗️ |   |NO❗️ |
| └ | growingRatio | External ❗️ |   |NO❗️ |
| └ | interestPerSecond | External ❗️ |   |NO❗️ |
| └ | lastInterestCompound | External ❗️ |   |NO❗️ |
| └ | liquidityBuffer | External ❗️ |   |NO❗️ |
| └ | mint | External ❗️ | 🛑  |NO❗️ |
| └ | pause | External ❗️ | 🛑  |NO❗️ |
| └ | unpause | External ❗️ | 🛑  |NO❗️ |
| └ | paused | External ❗️ |   |NO❗️ |
| └ | setInterest | External ❗️ | 🛑  |NO❗️ |
| └ | setLiquidityBuffer | External ❗️ | 🛑  |NO❗️ |
| └ | setUpdateTimeLimit | External ❗️ | 🛑  |NO❗️ |
| └ | totalAssetSupply | External ❗️ |   |NO❗️ |
| └ | transferAssetValue | External ❗️ | 🛑  |NO❗️ |
| └ | transferFromAssetValue | External ❗️ | 🛑  |NO❗️ |
| └ | updateRatio | External ❗️ | 🛑  |NO❗️ |
| └ | updateTimeLimit | External ❗️ |   |NO❗️ |
| └ | upgradeStatus | External ❗️ |   |NO❗️ |
| └ | withdraw | External ❗️ | 🛑  |NO❗️ |
| └ | withdrawTo | External ❗️ | 🛑  |NO❗️ |
| └ | stopFlowWhenCritical | External ❗️ | 🛑  |NO❗️ |
| └ | forceWrap | External ❗️ | 🛑  |NO❗️ |
| └ | superToken | External ❗️ |   |NO❗️ |
| └ | symbol | External ❗️ |   |NO❗️ |
||||||
| **IPriceFeedRouterV2** | Interface |  |||
| └ | DEFAULT_ADMIN_ROLE | External ❗️ |   |NO❗️ |
| └ | UPGRADER_ROLE | External ❗️ |   |NO❗️ |
| └ | changeUpgradeStatus | External ❗️ | 🛑  |NO❗️ |
| └ | cryptoToUsdStrategies | External ❗️ |   |NO❗️ |
| └ | decimalsConverter | External ❗️ |   |NO❗️ |
| └ | fiatIdToUsdStrategies | External ❗️ |   |NO❗️ |
| └ | fiatNameToFiatId | External ❗️ |   |NO❗️ |
| └ | getPrice | External ❗️ |   |NO❗️ |
| └ | getPrice | External ❗️ |   |NO❗️ |
| └ | getPriceOfAmount | External ❗️ |   |NO❗️ |
| └ | getPriceOfAmount | External ❗️ |   |NO❗️ |
| └ | getRoleAdmin | External ❗️ |   |NO❗️ |
| └ | grantRole | External ❗️ | 🛑  |NO❗️ |
| └ | hasRole | External ❗️ |   |NO❗️ |
| └ | initialize | External ❗️ | 🛑  |NO❗️ |
| └ | proxiableUUID | External ❗️ |   |NO❗️ |
| └ | renounceRole | External ❗️ | 🛑  |NO❗️ |
| └ | revokeRole | External ❗️ | 🛑  |NO❗️ |
| └ | setCryptoStrategy | External ❗️ | 🛑  |NO❗️ |
| └ | setFiatStrategy | External ❗️ | 🛑  |NO❗️ |
| └ | supportsInterface | External ❗️ |   |NO❗️ |
| └ | upgradeStatus | External ❗️ |   |NO❗️ |
| └ | upgradeTo | External ❗️ | 🛑  |NO❗️ |
| └ | upgradeToAndCall | External ❗️ |  💵 |NO❗️ |
||||||
| **IWrappedEther** | Interface |  |||
| └ | name | External ❗️ |   |NO❗️ |
| └ | approve | External ❗️ | 🛑  |NO❗️ |
| └ | totalSupply | External ❗️ |   |NO❗️ |
| └ | transferFrom | External ❗️ | 🛑  |NO❗️ |
| └ | withdraw | External ❗️ | 🛑  |NO❗️ |
| └ | decimals | External ❗️ |   |NO❗️ |
| └ | balanceOf | External ❗️ |   |NO❗️ |
| └ | symbol | External ❗️ |   |NO❗️ |
| └ | transfer | External ❗️ | 🛑  |NO❗️ |
| └ | deposit | External ❗️ |  💵 |NO❗️ |
| └ | allowance | External ❗️ |   |NO❗️ |


 Legend

|  Symbol  |  Meaning  |
|:--------:|-----------|
|    🛑    | Function can modify state |
|    💵    | Function is payable |
 

</div>
____
<sub>
Thinking about smart contract security? We can provide training, ongoing advice, and smart contract auditing. [Contact us](https://diligence.consensys.net/contact/).
</sub>

