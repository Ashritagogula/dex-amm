// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract DEX {
    address public tokenA;
    address public tokenB;

    uint256 public reserveA;
    uint256 public reserveB;

    uint256 public totalLiquidity;
    mapping(address => uint256) public liquidity;

    event LiquidityAdded(
        address indexed provider,
        uint256 amountA,
        uint256 amountB,
        uint256 liquidityMinted
    );

    event LiquidityRemoved(
        address indexed provider,
        uint256 amountA,
        uint256 amountB,
        uint256 liquidityBurned
    );

    event Swap(
        address indexed trader,
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut
    );

    constructor(address _tokenA, address _tokenB) {
        tokenA = _tokenA;
        tokenB = _tokenB;
    }

    function addLiquidity(uint256 amountA, uint256 amountB)
        external
        returns (uint256 liquidityMinted)
    {
        revert("Not implemented");
    }

    function removeLiquidity(uint256 liquidityAmount)
        external
        returns (uint256 amountA, uint256 amountB)
    {
        revert("Not implemented");
    }

    function swapAForB(uint256 amountAIn)
        external
        returns (uint256 amountBOut)
    {
        revert("Not implemented");
    }

    function swapBForA(uint256 amountBIn)
        external
        returns (uint256 amountAOut)
    {
        revert("Not implemented");
    }

    function getPrice() external view returns (uint256 price) {
        revert("Not implemented");
    }

    function getReserves()
        external
        view
        returns (uint256 _reserveA, uint256 _reserveB)
    {
        return (reserveA, reserveB);
    }

    function getAmountOut(
        uint256 amountIn,
        uint256 reserveIn,
        uint256 reserveOut
    ) public pure returns (uint256 amountOut) {
        revert("Not implemented");
    }
}
