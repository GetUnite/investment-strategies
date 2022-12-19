
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

Source Units Analyzed: **`32`**<br>
Source Units in Scope: **`32`** (**100%**)

| Type | File   | Logic Contracts | Interfaces | Lines | nLines | nSLOC | Comment Lines | Complex. Score | Capabilities |
|========|=================|============|=======|=======|===============|==============|  
| 📝 | contracts\CurveConvexStrategyV2.sol | 1 | **** | 445 | 364 | 269 | 54 | 195 | **<abbr title='Uses Hash-Functions'>🧮</abbr>** |
| 📝 | contracts\CurveConvexStrategyV2Native.sol | 1 | **** | 500 | 418 | 313 | 56 | 242 | **<abbr title='Payable Functions'>💰</abbr><abbr title='Uses Hash-Functions'>🧮</abbr>** |
| 📝 | contracts\StrategyHandler.sol | 1 | **** | 532 | 457 | 392 | 5 | 305 | **<abbr title='Initiates ETH Value Transfer'>📤</abbr><abbr title='Uses Hash-Functions'>🧮</abbr>** |
| 🔍 | contracts\deprecated\IAlluoStrategy.sol | **** | 1 | 50 | 11 | 3 | 22 | 9 | **** |
| 🔍 | contracts\interfaces\IAlluoStrategyV2.sol | **** | 1 | 58 | 11 | 4 | 21 | 15 | **** |
| 🔍 | contracts\interfaces\ICvxBaseRewardPool.sol | **** | 1 | 86 | 9 | 3 | 4 | 73 | **** |
| 🔍 | contracts\interfaces\ICvxBooster.sol | **** | 1 | 169 | 11 | 3 | 5 | 113 | **** |
| 🔍 | contracts\interfaces\IExchange.sol | **** | 1 | 42 | 16 | 13 | 7 | 16 | **<abbr title='Payable Functions'>💰</abbr>** |
| 🔍 | contracts\interfaces\IIbAlluo.sol | **** | 1 | 95 | 8 | 5 | 1 | 71 | **** |
| 🔍 | contracts\interfaces\IPriceFeedRouterV2.sol | **** | 1 | 106 | 27 | 23 | 6 | 52 | **<abbr title='Payable Functions'>💰</abbr>** |
| 🔍 | contracts\interfaces\IWrappedEther.sol | **** | 1 | 30 | 5 | 3 | 1 | 26 | **<abbr title='Payable Functions'>💰</abbr>** |
| 🔍 | contracts\deprecated\interfaces\IExchange.sol | **** | 1 | 42 | 16 | 13 | 7 | 16 | **<abbr title='Payable Functions'>💰</abbr>** |
| 📝🔍 | contracts\deprecated\mock\CurveEURtAdapter.sol | 1 | 1 | 89 | 57 | 37 | 12 | 47 | **<abbr title='Payable Functions'>💰</abbr>** |
| 📝 | contracts\deprecated\mock\Exchange.sol | 1 | **** | 655 | 570 | 358 | 119 | 339 | **<abbr title='Payable Functions'>💰</abbr>** |
| 🔍 | contracts\deprecated\mock\IExchangeAdapter.sol | **** | 1 | 26 | 6 | 3 | 4 | 16 | **<abbr title='Payable Functions'>💰</abbr>** |
| 🔍 | contracts\deprecated\mock\IWrappedEther.sol | **** | 1 | 30 | 5 | 3 | 1 | 26 | **<abbr title='Payable Functions'>💰</abbr>** |
| 📝 | contracts\deprecated\ethereum\Balancer\BalancerStrategy.sol | 1 | **** | 198 | 165 | 132 | 3 | 139 | **** |
| 📝 | contracts\deprecated\ethereum\CurveConvex\CurveConvexStrategy.sol | 1 | **** | 267 | 213 | 178 | 11 | 125 | **** |
| 📝 | contracts\deprecated\ethereum\CurveConvex\CurveConvexStrategyETH.sol | 1 | **** | 282 | 233 | 198 | 10 | 142 | **<abbr title='Payable Functions'>💰</abbr>** |
| 📝 | contracts\deprecated\ethereum\CurveConvex\CurveConvexStrategyLiquidity.sol | 1 | **** | 296 | 242 | 207 | 10 | 143 | **<abbr title='Payable Functions'>💰</abbr>** |
| 📝 | contracts\deprecated\ethereum\CurveConvex\CurveFraxConvexStrategy.sol | 1 | **** | 381 | 305 | 259 | 22 | 194 | **<abbr title='Payable Functions'>💰</abbr><abbr title='Initiates ETH Value Transfer'>📤</abbr>** |
| 📝 | contracts\deprecated\polygon\CurveHarvest\CurveHarvestEurStrategy.sol | 1 | **** | 229 | 177 | 148 | 9 | 114 | **** |
| 🔍 | contracts\deprecated\ethereum\Balancer\interfaces\IBalancer.sol | **** | 1 | 35 | 7 | 4 | 1 | 14 | **<abbr title='Payable Functions'>💰</abbr>** |
| 🔍 | contracts\deprecated\ethereum\Balancer\interfaces\IBalancerGaugeFactory.sol | **** | 1 | 8 | 7 | 4 | 1 | 3 | **** |
| 🔍 | contracts\deprecated\ethereum\Balancer\interfaces\IBalancerStructs.sol | **** | 1 | 68 | 68 | 58 | 2 | 1 | **** |
| 🔍 | contracts\deprecated\ethereum\Balancer\interfaces\ILiquidityGauge.sol | **** | 1 | 156 | 7 | 4 | 1 | 109 | **** |
| 🔍 | contracts\deprecated\ethereum\CurveConvex\interfaces\IConvexWrapper.sol | **** | 1 | 56 | 10 | 7 | 1 | 39 | **** |
| 🔍 | contracts\deprecated\ethereum\CurveConvex\interfaces\ICvxBaseRewardPool.sol | **** | 1 | 86 | 9 | 3 | 4 | 73 | **** |
| 🔍 | contracts\deprecated\ethereum\CurveConvex\interfaces\ICvxBooster.sol | **** | 1 | 169 | 11 | 3 | 5 | 113 | **** |
| 🔍 | contracts\deprecated\ethereum\CurveConvex\interfaces\IFraxFarmERC20.sol | **** | 1 | 123 | 18 | 14 | 3 | 75 | **** |
| 🔍 | contracts\deprecated\polygon\CurveHarvest\interfaces\IHarvestPool.sol | **** | 1 | 16 | 7 | 4 | 1 | 13 | **** |
| 🔍 | contracts\deprecated\polygon\CurveHarvest\interfaces\IHarvestVault.sol | **** | 1 | 11 | 6 | 4 | 1 | 9 | **** |
| 📝🔍 | **Totals** | **11** | **22** | **5336**  | **3476** | **2672** | **410** | **2867** | **<abbr title='Payable Functions'>💰</abbr><abbr title='Initiates ETH Value Transfer'>📤</abbr><abbr title='Uses Hash-Functions'>🧮</abbr>** |

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

Duplicate Source Units Excluded: **`4`** 

<a onclick="toggleVisibility('duplicate-files', this)">[➕]</a>
<div id="duplicate-files" style="display:none">
| File   |
|========|
|contracts\deprecated\interfaces\IExchange.sol|
|contracts\deprecated\mock\IWrappedEther.sol|
|contracts\deprecated\ethereum\CurveConvex\interfaces\ICvxBaseRewardPool.sol|
|contracts\deprecated\ethereum\CurveConvex\interfaces\ICvxBooster.sol|

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

The analysis finished with **`0`** errors and **`4`** duplicate files.





#### <span id=t-risk>Risk</span>

<div class="wrapper" style="max-width: 512px; margin: auto">
			<canvas id="chart-risk-summary"></canvas>
</div>

#### <span id=t-source-lines>Source Lines (sloc vs. nsloc)</span>

<div class="wrapper" style="max-width: 512px; margin: auto">
    <canvas id="chart-nsloc-total"></canvas>
</div>

#### <span id=t-inline-documentation>Inline Documentation</span>

- **Comment-to-Source Ratio:** On average there are`9.91` code lines per comment (lower=better).
- **ToDo's:** `0` 

#### <span id=t-components>Components</span>

| 📝Contracts   | 📚Libraries | 🔍Interfaces | 🎨Abstract |
|=============|===========|============|============|
| 11 | 0  | 22  | 0 |

#### <span id=t-exposed-functions>Exposed Functions</span>

This section lists functions that are explicitly declared public or payable. Please note that getter methods for public stateVars are not included.  

| 🌐Public   | 💰Payable |
|============|===========|
| 549 | 18  | 

| External   | Internal | Private | Pure | View |
|============|==========|=========|======|======|
| 511 | 299  | 22 | 39 | 237 |

#### <span id=t-statevariables>StateVariables</span>

| Total      | 🌐Public  |
|============|===========|
| 71  | 68 |

#### <span id=t-capabilities>Capabilities</span>

| Solidity Versions observed | 🧪 Experimental Features | 💰 Can Receive Funds | 🖥 Uses Assembly | 💣 Has Destroyable Contracts | 
|============|===========|===========|===========|
| `^0.8.11`<br/>`0.8.14`<br/>`^0.8.14`<br/>`>=0.8.0` |  | `yes` | **** | **** | 

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
| @openzeppelin/contracts/access/AccessControl.sol | 7 |
| @openzeppelin/contracts/access/IAccessControl.sol | 1 |
| @openzeppelin/contracts/interfaces/IERC20.sol | 10 |
| @openzeppelin/contracts/interfaces/IERC20Metadata.sol | 2 |
| @openzeppelin/contracts/security/ReentrancyGuard.sol | 1 |
| @openzeppelin/contracts/token/ERC20/IERC20.sol | 2 |
| @openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol | 9 |
| @openzeppelin/contracts/utils/Address.sol | 7 |
| hardhat/console.sol | 2 |

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
| contracts\deprecated\IAlluoStrategy.sol | 72b0752e2d2866249ef285df62c2c88878ff9920 |
| contracts\interfaces\IAlluoStrategyV2.sol | 1f0ce4dd067bb2c21fb1b9ace490f10c2c0c6e75 |
| contracts\interfaces\ICvxBaseRewardPool.sol | 7fc1044001a1413850c9916d99a0d8e7051fc777 |
| contracts\interfaces\ICvxBooster.sol | 264b9034753cfc5f840ed96b5ff0900c743e6ed7 |
| contracts\interfaces\IExchange.sol | eacc53f0cc8f513f79c4a066b42a9900d684ae9c |
| contracts\interfaces\IIbAlluo.sol | bb8673152fceb4711bf926bb9f86037202d4980e |
| contracts\interfaces\IPriceFeedRouterV2.sol | e8534887c807513f5c651a21710e80cd01f53e9a |
| contracts\interfaces\IWrappedEther.sol | 2004ec1b73d9982f0373aeb9af5e7d5a1e71b1a1 |
| contracts\deprecated\interfaces\IExchange.sol | eacc53f0cc8f513f79c4a066b42a9900d684ae9c |
| contracts\deprecated\mock\CurveEURtAdapter.sol | ca7e0c9a6c5e4b1c0a5561c1fa5cc16920204a7d |
| contracts\deprecated\mock\Exchange.sol | b5589c9893169b9c1d8a3e82618c0765fa72c5b7 |
| contracts\deprecated\mock\IExchangeAdapter.sol | becfc9d6de32ec5aae62cdc2ae833f66354a755b |
| contracts\deprecated\mock\IWrappedEther.sol | 2004ec1b73d9982f0373aeb9af5e7d5a1e71b1a1 |
| contracts\deprecated\ethereum\Balancer\BalancerStrategy.sol | 42bfd01b188b3686eab39fe8e484dc17a0f9076e |
| contracts\deprecated\ethereum\CurveConvex\CurveConvexStrategy.sol | d39c3583c900346bce0c418476b6e5df225bd049 |
| contracts\deprecated\ethereum\CurveConvex\CurveConvexStrategyETH.sol | 546d13d1243a1ae12929b65c24caeb04cc2d8aac |
| contracts\deprecated\ethereum\CurveConvex\CurveConvexStrategyLiquidity.sol | c87c462d4cb892c762c500282df1500ded89f20d |
| contracts\deprecated\ethereum\CurveConvex\CurveFraxConvexStrategy.sol | e630e9ce6300d0781488b1198bf0497369945bea |
| contracts\deprecated\polygon\CurveHarvest\CurveHarvestEurStrategy.sol | 59433e342d120879e0a473a526157f526927f4c5 |
| contracts\deprecated\ethereum\Balancer\interfaces\IBalancer.sol | f3399026a8e4c98b3df144033060496212d812a0 |
| contracts\deprecated\ethereum\Balancer\interfaces\IBalancerGaugeFactory.sol | f3ebeb469d210be9e885bacfb6b72f2c3cb8a716 |
| contracts\deprecated\ethereum\Balancer\interfaces\IBalancerStructs.sol | 53a523eb7791a9d488da8ec1865b57099528e6f0 |
| contracts\deprecated\ethereum\Balancer\interfaces\ILiquidityGauge.sol | 6fa4ffafda89f8dd31794064de03232a01a34b94 |
| contracts\deprecated\ethereum\CurveConvex\interfaces\IConvexWrapper.sol | 7be27c719910c7b5db1cbf9d40927bf1970c5ae9 |
| contracts\deprecated\ethereum\CurveConvex\interfaces\ICvxBaseRewardPool.sol | 7fc1044001a1413850c9916d99a0d8e7051fc777 |
| contracts\deprecated\ethereum\CurveConvex\interfaces\ICvxBooster.sol | 264b9034753cfc5f840ed96b5ff0900c743e6ed7 |
| contracts\deprecated\ethereum\CurveConvex\interfaces\IFraxFarmERC20.sol | 96c5b2c68b0d62f2cce57a02b83bc52061dc116f |
| contracts\deprecated\polygon\CurveHarvest\interfaces\IHarvestPool.sol | ba85ac87781fd5894e5d84e160883563a8ea8f84 |
| contracts\deprecated\polygon\CurveHarvest\interfaces\IHarvestVault.sol | 5cbef832fc50bc95945cecff11eafabbe4773167 |


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
| **IAlluoStrategy** | Interface |  |||
| └ | invest | External ❗️ | 🛑  |NO❗️ |
| └ | exitAll | External ❗️ | 🛑  |NO❗️ |
| └ | exitOnlyRewards | External ❗️ | 🛑  |NO❗️ |
| └ | multicall | External ❗️ | 🛑  |NO❗️ |
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
||||||
| **IExchange** | Interface |  |||
| └ | exchange | External ❗️ |  💵 |NO❗️ |
| └ | createInternalMajorRoutes | External ❗️ | 🛑  |NO❗️ |
| └ | createLpToken | External ❗️ | 🛑  |NO❗️ |
| └ | createApproval | External ❗️ | 🛑  |NO❗️ |
| └ | registerAdapters | External ❗️ | 🛑  |NO❗️ |
| └ | createMinorCoinEdge | External ❗️ | 🛑  |NO❗️ |
||||||
| **ICurveEURt** | Interface |  |||
| └ | exchange_underlying | External ❗️ | 🛑  |NO❗️ |
| └ | add_liquidity | External ❗️ | 🛑  |NO❗️ |
| └ | remove_liquidity_one_coin | External ❗️ | 🛑  |NO❗️ |
||||||
| **CurveEURtAdapter** | Implementation |  |||
| └ | indexByCoin | Public ❗️ |   |NO❗️ |
| └ | executeSwap | External ❗️ |  💵 |NO❗️ |
| └ | enterPool | External ❗️ |  💵 |NO❗️ |
| └ | exitPool | External ❗️ |  💵 |NO❗️ |
||||||
| **Exchange** | Implementation | ReentrancyGuard, AccessControl |||
| └ | <Constructor> | Public ❗️ | 🛑  |NO❗️ |
| └ | exchange | External ❗️ |  💵 | nonReentrant |
| └ | registerAdapters | External ❗️ | 🛑  | onlyRole |
| └ | unregisterAdapters | External ❗️ | 🛑  | onlyRole |
| └ | createMinorCoinEdge | External ❗️ | 🛑  | onlyRole |
| └ | deleteMinorCoinEdge | External ❗️ | 🛑  | onlyRole |
| └ | createInternalMajorRoutes | External ❗️ | 🛑  | onlyRole |
| └ | deleteInternalMajorRoutes | External ❗️ | 🛑  | onlyRole |
| └ | removeApproval | External ❗️ | 🛑  | onlyRole |
| └ | createApproval | External ❗️ | 🛑  | onlyRole |
| └ | createLpToken | External ❗️ | 🛑  | onlyRole |
| └ | deleteLpToken | External ❗️ | 🛑  | onlyRole |
| └ | grantRole | Public ❗️ | 🛑  | onlyRole |
| └ | buildRoute | Public ❗️ |   |NO❗️ |
| └ | getMajorRoute | External ❗️ |   |NO❗️ |
| └ | _exchange | Private 🔐 | 🛑  | |
| └ | _enterLiquidityPool | Private 🔐 | 🛑  | |
| └ | _exitLiquidityPool | Private 🔐 | 🛑  | |
| └ | reverseRouteEdge | Private 🔐 |   | |
| └ | <Receive Ether> | External ❗️ |  💵 |NO❗️ |
||||||
| **IExchangeAdapter** | Interface |  |||
| └ | executeSwap | External ❗️ |  💵 |NO❗️ |
| └ | enterPool | External ❗️ |  💵 |NO❗️ |
| └ | exitPool | External ❗️ |  💵 |NO❗️ |
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
||||||
| **BalancerStrategy** | Implementation | AccessControl, IAlluoStrategy, IBalancerStructs |||
| └ | <Constructor> | Public ❗️ | 🛑  |NO❗️ |
| └ | invest | External ❗️ | 🛑  | onlyRole |
| └ | exitAll | External ❗️ | 🛑  | onlyRole |
| └ | exitOnlyRewards | External ❗️ | 🛑  | onlyRole |
| └ | encodeEntryParams | External ❗️ |   |NO❗️ |
| └ | encodeExitParams | External ❗️ |   |NO❗️ |
| └ | decodeEntryParams | Public ❗️ |   |NO❗️ |
| └ | decodeExitParams | Public ❗️ |   |NO❗️ |
| └ | multicall | External ❗️ | 🛑  | onlyRole |
| └ | exchangeAll | Private 🔐 | 🛑  | |
||||||
| **CurveConvexStrategy** | Implementation | AccessControl, IAlluoStrategy |||
| └ | <Constructor> | Public ❗️ | 🛑  |NO❗️ |
| └ | invest | External ❗️ | 🛑  | onlyRole |
| └ | exitAll | External ❗️ | 🛑  | onlyRole |
| └ | exitOnlyRewards | External ❗️ | 🛑  | onlyRole |
| └ | multicall | External ❗️ | 🛑  | onlyRole |
| └ | encodeEntryParams | External ❗️ |   |NO❗️ |
| └ | encodeExitParams | Public ❗️ |   |NO❗️ |
| └ | decodeEntryParams | Public ❗️ |   |NO❗️ |
| └ | decodeExitParams | Public ❗️ |   |NO❗️ |
| └ | exchangeAll | Private 🔐 | 🛑  | |
| └ | manageRewardsAndWithdraw | Private 🔐 | 🛑  | |
| └ | getCvxRewardPool | Private 🔐 |   | |
||||||
| **CurveConvexStrategyETH** | Implementation | AccessControl, IAlluoStrategy |||
| └ | <Receive Ether> | External ❗️ |  💵 |NO❗️ |
| └ | <Constructor> | Public ❗️ | 🛑  |NO❗️ |
| └ | invest | External ❗️ | 🛑  | onlyRole |
| └ | exitAll | External ❗️ | 🛑  | onlyRole |
| └ | exitOnlyRewards | External ❗️ | 🛑  | onlyRole |
| └ | multicall | External ❗️ | 🛑  | onlyRole |
| └ | encodeEntryParams | External ❗️ |   |NO❗️ |
| └ | encodeExitParams | Public ❗️ |   |NO❗️ |
| └ | decodeEntryParams | Public ❗️ |   |NO❗️ |
| └ | decodeExitParams | Public ❗️ |   |NO❗️ |
| └ | exchangeAll | Private 🔐 | 🛑  | |
| └ | manageRewardsAndWithdraw | Private 🔐 | 🛑  | |
| └ | getCvxRewardPool | Private 🔐 |   | |
||||||
| **CurveConvexStrategyTest** | Implementation | AccessControl, IAlluoStrategy |||
| └ | <Constructor> | Public ❗️ | 🛑  |NO❗️ |
| └ | <Receive Ether> | External ❗️ |  💵 |NO❗️ |
| └ | invest | External ❗️ | 🛑  | onlyRole |
| └ | exitAll | External ❗️ | 🛑  | onlyRole |
| └ | exitOnlyRewards | External ❗️ | 🛑  | onlyRole |
| └ | multicall | External ❗️ | 🛑  | onlyRole |
| └ | encodeEntryParams | External ❗️ |   |NO❗️ |
| └ | encodeExitParams | Public ❗️ |   |NO❗️ |
| └ | decodeEntryParams | Public ❗️ |   |NO❗️ |
| └ | decodeExitParams | Public ❗️ |   |NO❗️ |
| └ | exchangeAll | Private 🔐 | 🛑  | |
| └ | manageRewardsAndWithdraw | Private 🔐 | 🛑  | |
| └ | getCvxRewardPool | Private 🔐 |   | |
||||||
| **CurveFraxConvexStrategy** | Implementation | AccessControl, IAlluoStrategy |||
| └ | <Receive Ether> | External ❗️ |  💵 |NO❗️ |
| └ | <Constructor> | Public ❗️ | 🛑  |NO❗️ |
| └ | invest | External ❗️ | 🛑  | onlyRole |
| └ | exitAll | External ❗️ | 🛑  | onlyRole |
| └ | exitOnlyRewards | External ❗️ | 🛑  | onlyRole |
| └ | multicall | External ❗️ | 🛑  | onlyRole |
| └ | encodeEntryParams | External ❗️ |   |NO❗️ |
| └ | encodeExitParams | Public ❗️ |   |NO❗️ |
| └ | decodeEntryParams | Public ❗️ |   |NO❗️ |
| └ | decodeExitParams | Public ❗️ |   |NO❗️ |
| └ | exchangeAll | Private 🔐 | 🛑  | |
| └ | manageRewardsAndWithdraw | Private 🔐 | 🛑  | |
| └ | getCvxRewardPool | Private 🔐 |   | |
||||||
| **CurveHarvestEurStrategy** | Implementation | AccessControl, IAlluoStrategy |||
| └ | <Constructor> | Public ❗️ | 🛑  |NO❗️ |
| └ | invest | External ❗️ | 🛑  | onlyRole |
| └ | exitAll | External ❗️ | 🛑  | onlyRole |
| └ | exitOnlyRewards | External ❗️ | 🛑  | onlyRole |
| └ | multicall | External ❗️ | 🛑  | onlyRole |
| └ | encodeEntryParams | External ❗️ |   |NO❗️ |
| └ | encodeExitParams | Public ❗️ |   |NO❗️ |
| └ | decodeEntryParams | Public ❗️ |   |NO❗️ |
| └ | decodeExitParams | Public ❗️ |   |NO❗️ |
| └ | exchangeAll | Private 🔐 | 🛑  | |
| └ | manageRewardsAndWithdraw | Private 🔐 | 🛑  | |
||||||
| **IBalancer** | Interface | IBalancerStructs |||
| └ | joinPool | External ❗️ |  💵 |NO❗️ |
| └ | getPoolTokens | External ❗️ |   |NO❗️ |
| └ | getPool | External ❗️ |   |NO❗️ |
| └ | exitPool | External ❗️ | 🛑  |NO❗️ |
||||||
| **IBalancerGaugeFactory** | Interface |  |||
| └ | getPoolGauge | External ❗️ |   |NO❗️ |
||||||
| **IBalancerStructs** | Interface |  |||
||||||
| **ILiquidityGauge** | Interface | IBalancerStructs |||
| └ | deposit | External ❗️ | 🛑  |NO❗️ |
| └ | deposit | External ❗️ | 🛑  |NO❗️ |
| └ | deposit | External ❗️ | 🛑  |NO❗️ |
| └ | withdraw | External ❗️ | 🛑  |NO❗️ |
| └ | withdraw | External ❗️ | 🛑  |NO❗️ |
| └ | claim_rewards | External ❗️ | 🛑  |NO❗️ |
| └ | claim_rewards | External ❗️ | 🛑  |NO❗️ |
| └ | claim_rewards | External ❗️ | 🛑  |NO❗️ |
| └ | transferFrom | External ❗️ | 🛑  |NO❗️ |
| └ | transfer | External ❗️ | 🛑  |NO❗️ |
| └ | approve | External ❗️ | 🛑  |NO❗️ |
| └ | permit | External ❗️ | 🛑  |NO❗️ |
| └ | increaseAllowance | External ❗️ | 🛑  |NO❗️ |
| └ | decreaseAllowance | External ❗️ | 🛑  |NO❗️ |
| └ | user_checkpoint | External ❗️ | 🛑  |NO❗️ |
| └ | set_rewards_receiver | External ❗️ | 🛑  |NO❗️ |
| └ | kick | External ❗️ | 🛑  |NO❗️ |
| └ | deposit_reward_token | External ❗️ | 🛑  |NO❗️ |
| └ | add_reward | External ❗️ | 🛑  |NO❗️ |
| └ | set_reward_distributor | External ❗️ | 🛑  |NO❗️ |
| └ | killGauge | External ❗️ | 🛑  |NO❗️ |
| └ | unkillGauge | External ❗️ | 🛑  |NO❗️ |
| └ | claimed_reward | External ❗️ |   |NO❗️ |
| └ | claimable_reward | External ❗️ |   |NO❗️ |
| └ | claimable_tokens | External ❗️ | 🛑  |NO❗️ |
| └ | integrate_checkpoint | External ❗️ |   |NO❗️ |
| └ | future_epoch_time | External ❗️ |   |NO❗️ |
| └ | inflation_rate | External ❗️ |   |NO❗️ |
| └ | decimals | External ❗️ |   |NO❗️ |
| └ | version | External ❗️ |   |NO❗️ |
| └ | allowance | External ❗️ |   |NO❗️ |
| └ | initialize | External ❗️ | 🛑  |NO❗️ |
| └ | balanceOf | External ❗️ |   |NO❗️ |
| └ | totalSupply | External ❗️ |   |NO❗️ |
| └ | name | External ❗️ |   |NO❗️ |
| └ | symbol | External ❗️ |   |NO❗️ |
| └ | DOMAIN_SEPARATOR | External ❗️ |   |NO❗️ |
| └ | nonces | External ❗️ |   |NO❗️ |
| └ | lp_token | External ❗️ |   |NO❗️ |
| └ | is_killed | External ❗️ |   |NO❗️ |
| └ | reward_count | External ❗️ |   |NO❗️ |
| └ | reward_data | External ❗️ |   |NO❗️ |
| └ | rewards_receiver | External ❗️ |   |NO❗️ |
| └ | reward_integral_for | External ❗️ |   |NO❗️ |
| └ | working_balances | External ❗️ |   |NO❗️ |
| └ | working_supply | External ❗️ |   |NO❗️ |
| └ | integrate_inv_supply_of | External ❗️ |   |NO❗️ |
| └ | integrate_checkpoint_of | External ❗️ |   |NO❗️ |
| └ | integrate_fraction | External ❗️ |   |NO❗️ |
| └ | period | External ❗️ |   |NO❗️ |
| └ | reward_tokens | External ❗️ |   |NO❗️ |
| └ | period_timestamp | External ❗️ |   |NO❗️ |
| └ | integrate_inv_supply | External ❗️ |   |NO❗️ |
||||||
| **IConvexWrapper** | Interface |  |||
| └ | convexPoolId | External ❗️ |   |NO❗️ |
| └ | balanceOf | External ❗️ |   |NO❗️ |
| └ | totalBalanceOf | External ❗️ |   |NO❗️ |
| └ | deposit | External ❗️ | 🛑  |NO❗️ |
| └ | stake | External ❗️ | 🛑  |NO❗️ |
| └ | withdraw | External ❗️ | 🛑  |NO❗️ |
| └ | withdrawAndUnwrap | External ❗️ | 🛑  |NO❗️ |
| └ | getReward | External ❗️ | 🛑  |NO❗️ |
| └ | getReward | External ❗️ | 🛑  |NO❗️ |
| └ | rewardLength | External ❗️ |   |NO❗️ |
| └ | earned | External ❗️ |   |NO❗️ |
| └ | setVault | External ❗️ | 🛑  |NO❗️ |
| └ | user_checkpoint | External ❗️ | 🛑  |NO❗️ |
| └ | createVault | External ❗️ | 🛑  |NO❗️ |
| └ | stakeLockedCurveLp | External ❗️ | 🛑  |NO❗️ |
| └ | withdrawLockedAndUnwrap | External ❗️ | 🛑  |NO❗️ |
| └ | getReward | External ❗️ | 🛑  |NO❗️ |
| └ | owner | External ❗️ |   |NO❗️ |
| └ | rewards | External ❗️ |   |NO❗️ |
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
| **IFraxFarmERC20** | Interface |  |||
| └ | earned | External ❗️ |   |NO❗️ |
| └ | rewardLength | External ❗️ |   |NO❗️ |
| └ | owner | External ❗️ |   |NO❗️ |
| └ | stakingToken | External ❗️ |   |NO❗️ |
| └ | fraxPerLPToken | External ❗️ |   |NO❗️ |
| └ | calcCurCombinedWeight | External ❗️ |   |NO❗️ |
| └ | lockedStakesOf | External ❗️ |   |NO❗️ |
| └ | lockedStakesOfLength | External ❗️ |   |NO❗️ |
| └ | lockAdditional | External ❗️ | 🛑  |NO❗️ |
| └ | lockLonger | External ❗️ | 🛑  |NO❗️ |
| └ | stakeLocked | External ❗️ | 🛑  |NO❗️ |
| └ | withdrawLocked | External ❗️ | 🛑  |NO❗️ |
| └ | withdrawLocked | External ❗️ | 🛑  |NO❗️ |
| └ | periodFinish | External ❗️ |   |NO❗️ |
| └ | getAllRewardTokens | External ❗️ |   |NO❗️ |
| └ | totalLiquidityLocked | External ❗️ |   |NO❗️ |
| └ | lockedLiquidityOf | External ❗️ |   |NO❗️ |
| └ | totalCombinedWeight | External ❗️ |   |NO❗️ |
| └ | combinedWeightOf | External ❗️ |   |NO❗️ |
| └ | lockMultiplier | External ❗️ |   |NO❗️ |
| └ | rewardRates | External ❗️ |   |NO❗️ |
| └ | userStakedFrax | External ❗️ |   |NO❗️ |
| └ | proxyStakedFrax | External ❗️ |   |NO❗️ |
| └ | maxLPForMaxBoost | External ❗️ |   |NO❗️ |
| └ | minVeFXSForMaxBoost | External ❗️ |   |NO❗️ |
| └ | minVeFXSForMaxBoostProxy | External ❗️ |   |NO❗️ |
| └ | veFXSMultiplier | External ❗️ |   |NO❗️ |
| └ | toggleValidVeFXSProxy | External ❗️ | 🛑  |NO❗️ |
| └ | proxyToggleStaker | External ❗️ | 🛑  |NO❗️ |
| └ | stakerSetVeFXSProxy | External ❗️ | 🛑  |NO❗️ |
| └ | getReward | External ❗️ | 🛑  |NO❗️ |
| └ | getReward | External ❗️ | 🛑  |NO❗️ |
| └ | vefxs_max_multiplier | External ❗️ |   |NO❗️ |
| └ | vefxs_boost_scale_factor | External ❗️ |   |NO❗️ |
| └ | vefxs_per_frax_for_max_boost | External ❗️ |   |NO❗️ |
| └ | getProxyFor | External ❗️ |   |NO❗️ |
| └ | sync | External ❗️ | 🛑  |NO❗️ |
||||||
| **IHarvestPool** | Interface | IERC20 |||
| └ | stake | External ❗️ | 🛑  |NO❗️ |
| └ | getReward | External ❗️ | 🛑  |NO❗️ |
| └ | withdraw | External ❗️ | 🛑  |NO❗️ |
| └ | exit | External ❗️ | 🛑  |NO❗️ |
| └ | stakedBalanceOf | External ❗️ |   |NO❗️ |
||||||
| **IHarvestVault** | Interface | IERC20 |||
| └ | deposit | External ❗️ | 🛑  |NO❗️ |
| └ | withdrawAll | External ❗️ | 🛑  |NO❗️ |
| └ | withdraw | External ❗️ | 🛑  |NO❗️ |


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

